/*
  MediBridge firmware (ESP32) — Smart Medication Monitoring
  REMIND - GUIDE - DETECT - INFORM

  What it does
    * 3 compartments: lid sensor (button), LED, simulated stock level (potentiometer)
    * 1 buzzer
    * Reminder commands arrive from Blynk (V6) or the Serial Monitor
    * Every important thing becomes a small JSON "event" (see firmware/event_format.md)
    * Events go to Blynk datastream V10; they are also always printed on Serial
    * Works OFFLINE (Serial only) when config.h is missing or has no real token

  It records that a lid was OPENED. It can NOT know the medicine was taken.
*/
#include <Arduino.h>
#include <WiFi.h>
#include <time.h>
#include <string.h>
#include <esp_system.h>   // esp_random()

#if __has_include("config.h")
#include "config.h"
#endif

#ifndef MB_DEVICE_ID
#define MB_DEVICE_ID "MB-ESP32-01"
#endif
#ifndef MB_WIFI_SSID
#define MB_WIFI_SSID "Wokwi-GUEST"
#define MB_WIFI_PASS ""
#define MB_WIFI_CHANNEL 6
#endif
#ifndef ESP_ARDUINO_VERSION_MAJOR
#define ESP_ARDUINO_VERSION_MAJOR 2
#endif

#if defined(BLYNK_AUTH_TOKEN) && defined(BLYNK_TEMPLATE_ID) && defined(BLYNK_TEMPLATE_NAME)
#define MB_BLYNK_COMPILED 1
#include <BlynkSimpleEsp32.h>
#else
#define MB_BLYNK_COMPILED 0
#endif

#include "medibridge_config.h"

// ============================================================ Blynk pin plan
// Core (always used)                    Extended (MB_EXTENDED_PINS = 1)
//  V6  reminder command  (in)            V0-V2 lid interaction 1/0  (out)
//  V7  buzzer command    (in)            V3-V5 stock percent        (out)
//  V8  device status     (out)           V9    wrong compartment id (out)
//  V10 event JSON        (out)
//  V11 heartbeat seconds (out)
static const int VP_INTERACTION_BASE = 0;   // V0..V2
static const int VP_STOCK_BASE       = 3;   // V3..V5
static const int VP_WRONG            = 9;
static const int VP_STATUS           = 8;
static const int VP_EVENT            = 10;
static const int VP_HEARTBEAT        = 11;
static const int VP_REMINDER_CMD     = 6;

// ================================================================ utilities
static inline bool before(uint32_t now, uint32_t t) { return (int32_t)(now - t) < 0; }

// =========================================================== stock sensor API
// Today: potentiometer. Later: replace with a load cell + HX711 by writing a
// class with the same two methods (see firmware/README.md). Nothing else changes.
class StockSensor {
 public:
  virtual void begin() = 0;
  virtual uint8_t readPercent(uint8_t idx) = 0;
  virtual ~StockSensor() {}
};

class PotStockSensor : public StockSensor {
 public:
  void begin() override { analogReadResolution(12); }
  uint8_t readPercent(uint8_t idx) override {
    long sum = 0;
    for (int i = 0; i < 8; i++) sum += analogRead(MB_STOCK_PINS[idx]);
    return mb::rawToPercent(sum / 8, MB_ADC_RAW_EMPTY, MB_ADC_RAW_FULL);
  }
};

static PotStockSensor g_potSensor;
static StockSensor* g_stockSensor = &g_potSensor;

// ================================================================== buzzer
enum Pattern : uint8_t { P_NONE, P_REMINDER, P_WARNING, P_ALERT, P_TEST };
struct Step { uint16_t freq; uint16_t ms; };
static const Step STEPS_REMINDER[] = {{2000, 300}, {0, 200}, {2000, 300}, {0, 1200}};
static const Step STEPS_WARNING[]  = {{700, 120}, {0, 120}};
static const Step STEPS_ALERT[]    = {{1200, 200}, {0, 150}};
static const Step STEPS_TEST[]     = {{1500, 1000}};

#if ESP_ARDUINO_VERSION_MAJOR >= 3
#define BUZ_ID MB_BUZZER_PIN
#else
#define BUZ_ID 0
#endif

static void buzzerHw(uint16_t freq) { ledcWriteTone(BUZ_ID, freq); }
static void buzzerInit() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(MB_BUZZER_PIN, 2000, 8);
#else
  ledcSetup(0, 2000, 8);
  ledcAttachPin(MB_BUZZER_PIN, 0);
#endif
  buzzerHw(0);
}

class Buzzer {
 public:
  void set(Pattern p, uint32_t now) {
    if (p == cur_) return;
    cur_ = p; idx_ = 0; start_ = now; apply();
  }
  void update(uint32_t now) {
    if (cur_ == P_NONE) return;
    uint8_t n; const Step* s = steps(n);
    if ((uint32_t)(now - start_) >= s[idx_].ms) { idx_ = (idx_ + 1) % n; start_ = now; apply(); }
  }
 private:
  const Step* steps(uint8_t& n) const {
    switch (cur_) {
      case P_REMINDER: n = sizeof STEPS_REMINDER / sizeof(Step); return STEPS_REMINDER;
      case P_WARNING:  n = sizeof STEPS_WARNING / sizeof(Step);  return STEPS_WARNING;
      case P_ALERT:    n = sizeof STEPS_ALERT / sizeof(Step);    return STEPS_ALERT;
      default:         n = sizeof STEPS_TEST / sizeof(Step);     return STEPS_TEST;
    }
  }
  void apply() {
    if (cur_ == P_NONE) { buzzerHw(0); return; }
    uint8_t n; const Step* s = steps(n);
    buzzerHw(s[idx_].freq);
  }
  Pattern cur_ = P_NONE; uint8_t idx_ = 0; uint32_t start_ = 0;
};
static Buzzer g_buzzer;

// ================================================================== state
static mb::Debouncer    g_deb[MB_NUM_COMPARTMENTS];
static mb::StockTracker g_stock[MB_NUM_COMPARTMENTS];
static bool      g_lidOpen[MB_NUM_COMPARTMENTS];
static uint8_t   g_lastSentPct[MB_NUM_COMPARTMENTS];
static uint32_t  g_confirmUntil[MB_NUM_COMPARTMENTS];
static uint32_t  g_lastInteractionMs[MB_NUM_COMPARTMENTS];
static bool      g_everInteracted[MB_NUM_COMPARTMENTS];

static uint8_t  g_reminderComp = 0;       // 0 = none, else 1..3
static uint32_t g_reminderStartMs = 0;
static bool     g_muted = false;
static uint32_t g_warningUntil = 0, g_testUntil = 0, g_alertUntil = 0;
static uint8_t  g_warnIdx = 0;
static uint32_t g_bootId = 0, g_seq = 0;
static uint32_t g_nextStockPoll = 0;

// -------- event queue (kept while the cloud is unreachable)
struct QueuedEvent { char json[MB_EVENT_JSON_MAX]; };
static QueuedEvent g_q[MB_EVENT_QUEUE_SIZE];
static uint8_t g_qHead = 0, g_qCount = 0;
static uint32_t g_nextSendMs = 0;

// -------- cloud state
static bool g_cloud = false;              // true only if a real token is configured
static bool g_wifiWasUp = false, g_blynkWasUp = false;
static uint32_t g_lastWifiTry = 0, g_nextBlynkTry = 0, g_nextHeartbeat = 0;

#if MB_BLYNK_COMPILED
static bool tokenLooksValid() {
  return strncmp(BLYNK_AUTH_TOKEN, "PASTE_", 6) != 0 && strlen(BLYNK_AUTH_TOKEN) >= 16 &&
         strncmp(BLYNK_TEMPLATE_ID, "PASTE_", 6) != 0;
}
#endif

static void cloudInt(int pin, int value, bool extendedOnly) {
#if MB_BLYNK_COMPILED
  if (!g_cloud || !Blynk.connected()) return;
  if (extendedOnly && !MB_EXTENDED_PINS) return;
  Blynk.virtualWrite(pin, value);
#else
  (void)pin; (void)value; (void)extendedOnly;
#endif
}

// ================================================================ events
static bool isoTimestamp(char* out, size_t n) {
  time_t t = time(nullptr);
  if (t < 1700000000) { out[0] = 0; return false; }   // clock not synced yet
  struct tm tmv;
  gmtime_r(&t, &tmv);
  strftime(out, n, "%Y-%m-%dT%H:%M:%SZ", &tmv);
  return true;
}

static void queuePush(const char* json) {
  if (g_qCount == MB_EVENT_QUEUE_SIZE) {            // full: drop the oldest
    g_qHead = (g_qHead + 1) % MB_EVENT_QUEUE_SIZE; g_qCount--;
    Serial.println("[WARN] event queue full, oldest event dropped");
  }
  QueuedEvent& slot = g_q[(g_qHead + g_qCount) % MB_EVENT_QUEUE_SIZE];
  strncpy(slot.json, json, MB_EVENT_JSON_MAX - 1);
  slot.json[MB_EVENT_JSON_MAX - 1] = 0;
  g_qCount++;
}

static void emitEvent(uint8_t comp, const char* type, long value, const char* detail) {
  char id[48];
  snprintf(id, sizeof id, "%s-%08lx-%04lu", MB_DEVICE_ID, (unsigned long)g_bootId, (unsigned long)(++g_seq));
  char ts[24];
  bool synced = isoTimestamp(ts, sizeof ts);
  mb::EventFields e = {id, MB_DEVICE_ID, comp, type, value, ts, synced, (unsigned long)millis(), detail};
  char buf[MB_EVENT_JSON_MAX];
  size_t len = mb::buildEventJson(buf, sizeof buf, e);
  if (len == 0) { Serial.println("[ERROR] event too large, not sent"); return; }
  Serial.print("[EVENT] ");
  Serial.println(buf);
  if (g_cloud) queuePush(buf);
}

// ============================================================== reminders
static void startReminder(uint8_t comp, const char* source) {
  if (comp < 1 || comp > MB_NUM_COMPARTMENTS) return;
  if (g_reminderComp == comp) return;               // same command twice: ignore
  g_reminderComp = comp;
  g_reminderStartMs = millis();
  g_muted = false;
  emitEvent(comp, "reminder_started", comp, source);
}

static void stopReminder(const char* reason, bool tellCloudCommand) {
  if (g_reminderComp == 0) return;
  uint8_t comp = g_reminderComp;
  g_reminderComp = 0;
  if (strcmp(reason, "acknowledged") != 0) emitEvent(comp, "reminder_stopped", 0, reason);
  if (tellCloudCommand) cloudInt(VP_REMINDER_CMD, 0, false);  // so V6 in the cloud goes back to 0
}

// ================================================================ lid events
static void onLidOpened(uint8_t idx, uint32_t now) {
  uint8_t id = idx + 1;
  g_lidOpen[idx] = true;
  g_lastInteractionMs[idx] = now;
  g_everInteracted[idx] = true;
  cloudInt(VP_INTERACTION_BASE + idx, 1, true);

  mb::OpenKind k = mb::classifyOpen(g_reminderComp, id);
  if (k == mb::OPEN_WRONG) {
    char d[24];
    snprintf(d, sizeof d, "expected=%u", (unsigned)g_reminderComp);
    emitEvent(id, "wrong_compartment", 1, d);
    cloudInt(VP_WRONG, id, true);
    g_warningUntil = now + MB_WARNING_MS;
    g_warnIdx = idx;
  } else {
    emitEvent(id, "compartment_opened", 1, k == mb::OPEN_EXPECTED ? "expected" : "no_active_reminder");
    g_confirmUntil[idx] = now + MB_CONFIRM_LED_MS;
    if (k == mb::OPEN_EXPECTED) stopReminder("acknowledged", true);
  }
}

static void onLidClosed(uint8_t idx, uint32_t now) {
  g_lidOpen[idx] = false;
  g_lastInteractionMs[idx] = now;
  cloudInt(VP_INTERACTION_BASE + idx, 0, true);
  emitEvent(idx + 1, "compartment_closed", 0, "");
}

static void readSensors(uint32_t now) {
  for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) {
    bool raw = (digitalRead(MB_SENSOR_PINS[i]) == MB_SENSOR_ACTIVE_LEVEL);
    if (g_deb[i].update(raw, now)) {
      if (g_deb[i].stable()) onLidOpened(i, now); else onLidClosed(i, now);
    }
  }
}

// ================================================================== stock
static void readStock(uint32_t now) {
  if (before(now, g_nextStockPoll)) return;
  g_nextStockPoll = now + MB_STOCK_POLL_MS;
  for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) {
    uint8_t pct = g_stockSensor->readPercent(i);
    mb::StockStatus before_ = g_stock[i].status();
    if (g_stock[i].update(pct, now)) {
      mb::StockStatus after = g_stock[i].status();
      char d[32];
      snprintf(d, sizeof d, "%s->%s", mb::stockStatusName(before_), mb::stockStatusName(after));
      if (after == mb::STOCK_EMPTY) {
        emitEvent(i + 1, "stock_empty", pct, d);
        g_alertUntil = now + MB_EMPTY_ALERT_MS;
      } else {
        emitEvent(i + 1, "stock_changed", pct, d);
      }
      cloudInt(VP_STOCK_BASE + i, pct, true);
      g_lastSentPct[i] = pct;
    } else {
      int diff = (int)pct - (int)g_lastSentPct[i];
      if (diff < 0) diff = -diff;
      if (diff >= MB_STOCK_REPORT_DELTA) { cloudInt(VP_STOCK_BASE + i, pct, true); g_lastSentPct[i] = pct; }
    }
  }
}

static void checkReminderTimeout(uint32_t now) {
  if (g_reminderComp && (uint32_t)(now - g_reminderStartMs) >= MB_REMINDER_TIMEOUT_MS) {
    uint8_t comp = g_reminderComp;
    emitEvent(comp, "reminder_missed", 0, "timeout");
    g_reminderComp = 0;
    cloudInt(VP_REMINDER_CMD, 0, false);
  }
}

// ================================================================ outputs
static const char* stateLabel(uint8_t idx, uint32_t now) {
  if (before(now, g_warningUntil) && g_warnIdx == idx) return "Wrong Compartment";
  if (g_reminderComp == idx + 1) return "Reminder Active";
  if (g_stock[idx].status() == mb::STOCK_EMPTY) return "Medicine Refill Required";
  if (before(now, g_confirmUntil[idx])) return "Interaction Recorded";
  return "Idle";
}

static void updateOutputs(uint32_t now) {
  for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) {
    bool on = false;
    if (before(now, g_warningUntil) && g_warnIdx == i)        on = ((now / 120) % 2) == 0;   // fast flicker
    else if (g_reminderComp == i + 1)                         on = ((now / 500) % 2) == 0;   // steady blink
    else if (before(now, g_confirmUntil[i]))                  on = true;                     // solid
    else if (g_stock[i].status() == mb::STOCK_EMPTY)          on = (now % 2000) < 100;       // short blip
    digitalWrite(MB_LED_PINS[i], on ? HIGH : LOW);
  }
  Pattern p = P_NONE;
  if (before(now, g_warningUntil))        p = P_WARNING;
  else if (before(now, g_testUntil))      p = P_TEST;
  else if (before(now, g_alertUntil))     p = P_ALERT;
  else if (g_reminderComp && !g_muted)    p = P_REMINDER;
  g_buzzer.set(p, now);
  g_buzzer.update(now);
}

// ============================================================ Serial control
static void printStatus() {
  uint32_t now = millis();
  Serial.println("---- MediBridge status ----");
  for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) {
    Serial.printf("C%u %-10s dose=%-10s at=%s lid=%s stock=%u%% (%s) led=%s state=%s\n",
                  i + 1, MB_COMPARTMENTS[i].name, MB_COMPARTMENTS[i].dosage, MB_COMPARTMENTS[i].schedule,
                  g_lidOpen[i] ? "OPEN" : "closed", (unsigned)g_stock[i].percent(),
                  mb::stockStatusName(g_stock[i].status()),
                  digitalRead(MB_LED_PINS[i]) ? "ON" : "off", stateLabel(i, now));
  }
  Serial.printf("reminder=%u muted=%d cloud=%s queued=%u\n", (unsigned)g_reminderComp, (int)g_muted,
                g_cloud ? "enabled" : "OFFLINE mode", (unsigned)g_qCount);
}

static void handleCommand(const char* line) {
  if (line[0] == 'r' && line[1] >= '0' && line[1] <= '3') {
    int c = line[1] - '0';
    if (c == 0) stopReminder("cancelled_serial", true); else startReminder(c, "serial");
  } else if (line[0] == 'm') { g_muted = true; Serial.println("buzzer muted until next reminder"); }
  else if (line[0] == 'b') { g_testUntil = millis() + 1500; }
  else if (line[0] == 's') { printStatus(); }
  else if (line[0] == 'h' || line[0] == '?') {
    Serial.println("Commands: r1 r2 r3 = start reminder | r0 = cancel | m = mute | b = beep test | s = status");
  }
}

static void handleSerial() {
  static char buf[16]; static uint8_t n = 0;
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') { if (n) { buf[n] = 0; handleCommand(buf); n = 0; } }
    else if (n < sizeof buf - 1) buf[n++] = c;
  }
}

// ================================================================== Blynk
#if MB_BLYNK_COMPILED
BLYNK_WRITE(V6) {                       // reminder command: 0 = cancel, 1..3 = compartment
  int v = param.asInt();
  if (v >= 1 && v <= MB_NUM_COMPARTMENTS) startReminder((uint8_t)v, "blynk");
  else if (v == 0) stopReminder("cancelled_cloud", false);
}
BLYNK_WRITE(V7) {                       // buzzer command: 0 = mute reminder sound, 1 = test beep
  int v = param.asInt();
  if (v == 0) g_muted = true;
  else if (v == 1) g_testUntil = millis() + 1500;
}
BLYNK_CONNECTED() {
  Blynk.virtualWrite(VP_STATUS, "online fw=" MB_FW_VERSION);
  Blynk.syncVirtual(VP_REMINDER_CMD);
  if (MB_EXTENDED_PINS) {
    for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) {
      Blynk.virtualWrite(VP_INTERACTION_BASE + i, g_lidOpen[i] ? 1 : 0);
      Blynk.virtualWrite(VP_STOCK_BASE + i, (int)g_stock[i].percent());
    }
  }
}
#endif

static void networkSetup() {
#if MB_BLYNK_COMPILED
  if (!tokenLooksValid()) {
    Serial.println("[NET] config.h has placeholder credentials -> OFFLINE mode (Serial only)");
    return;
  }
  g_cloud = true;
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(MB_WIFI_SSID, MB_WIFI_PASS, MB_WIFI_CHANNEL);
  Blynk.config(BLYNK_AUTH_TOKEN, "blynk.cloud", 80);
  Serial.println("[NET] cloud mode: connecting WiFi, then Blynk (non-blocking)");
#else
  Serial.println("[NET] no config.h -> OFFLINE mode (Serial only)");
#endif
}

static void networkLoop(uint32_t now) {
#if MB_BLYNK_COMPILED
  if (!g_cloud) return;
  if (WiFi.status() != WL_CONNECTED) {
    if (g_wifiWasUp) { g_wifiWasUp = false; Serial.println("[NET] WiFi lost"); }
    if ((uint32_t)(now - g_lastWifiTry) >= MB_WIFI_RETRY_MS) {
      g_lastWifiTry = now;
      WiFi.disconnect();
      WiFi.begin(MB_WIFI_SSID, MB_WIFI_PASS, MB_WIFI_CHANNEL);
      Serial.println("[NET] retrying WiFi");
    }
    return;
  }
  if (!g_wifiWasUp) {
    g_wifiWasUp = true;
    Serial.print("[NET] WiFi connected, IP ");
    Serial.println(WiFi.localIP());
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");     // real timestamps
  }
  if (Blynk.connected()) {
    if (!g_blynkWasUp) { g_blynkWasUp = true; Serial.println("[NET] Blynk connected"); }
    Blynk.run();
    static uint32_t s_nextSync = 0;
    if (!before(now, s_nextSync)) {
      s_nextSync = now + 1000;
      Blynk.syncVirtual(VP_REMINDER_CMD);
    }
    if (!before(now, g_nextHeartbeat)) {
      g_nextHeartbeat = now + MB_HEARTBEAT_MS;
      Blynk.virtualWrite(VP_HEARTBEAT, (int)(now / 1000));
    }
  } else {
    if (g_blynkWasUp) { g_blynkWasUp = false; Serial.println("[NET] Blynk disconnected"); }
    if (!before(now, g_nextBlynkTry)) {
      g_nextBlynkTry = now + MB_BLYNK_RETRY_MS;
      Serial.println("[NET] connecting to Blynk...");
      Blynk.connect(6000);
    }
  }
#else
  (void)now;
#endif
}

static void drainQueue(uint32_t now) {
#if MB_BLYNK_COMPILED
  if (!g_cloud || g_qCount == 0 || !Blynk.connected()) return;
  if (before(now, g_nextSendMs)) return;
  g_nextSendMs = now + MB_EVENT_SPACING_MS;
  Blynk.virtualWrite(VP_EVENT, g_q[g_qHead].json);
  g_qHead = (g_qHead + 1) % MB_EVENT_QUEUE_SIZE;
  g_qCount--;
#else
  (void)now;
#endif
}

// ================================================================== Arduino
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("MediBridge firmware " MB_FW_VERSION "  (type h for commands)");

  for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) {
    pinMode(MB_LED_PINS[i], OUTPUT);
    digitalWrite(MB_LED_PINS[i], LOW);
    pinMode(MB_SENSOR_PINS[i], INPUT_PULLUP);
  }
  buzzerInit();
  g_stockSensor->begin();
  g_bootId = esp_random();

  // Self-test: flash every LED once, short beep.
  for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) digitalWrite(MB_LED_PINS[i], HIGH);
  buzzerHw(1500); delay(150); buzzerHw(0); delay(150);
  for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) digitalWrite(MB_LED_PINS[i], LOW);

  const mb::StockThresholds th = {MB_STOCK_FULL_MIN, MB_STOCK_MEDIUM_MIN, MB_STOCK_LOW_MIN,
                                  MB_STOCK_HYSTERESIS, MB_STOCK_CONFIRM_MS};
  uint32_t now = millis();
  for (uint8_t i = 0; i < MB_NUM_COMPARTMENTS; i++) {
    g_deb[i] = mb::Debouncer(MB_DEBOUNCE_MS);
    g_deb[i].init(digitalRead(MB_SENSOR_PINS[i]) == MB_SENSOR_ACTIVE_LEVEL, now);
    g_lidOpen[i] = g_deb[i].stable();
    uint8_t pct = g_stockSensor->readPercent(i);
    g_stock[i].init(pct, th);
    g_lastSentPct[i] = pct;
  }

  networkSetup();
  emitEvent(0, "device_started", 0, "fw=" MB_FW_VERSION);
  printStatus();
}

void loop() {
  uint32_t now = millis();
  handleSerial();
  readSensors(now);
  readStock(now);
  checkReminderTimeout(now);
  updateOutputs(now);
  networkLoop(now);
  drainQueue(now);
}
