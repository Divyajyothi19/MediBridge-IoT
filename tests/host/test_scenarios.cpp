// Runs the REAL circuit/sketch.ino on a PC with a fake Arduino + fake Blynk.
// Verifies scenarios A-D, debounce, offline queue, timeout, event JSON.
// This is a logic test. It is NOT a Wokwi run and NOT a hardware test.
#include "../../circuit/sketch.ino"
#include <stdlib.h>

FakeHw HW; FakeSerial Serial; FakeWiFi WiFi; FakeBlynk Blynk;

static int fails = 0, checks = 0;
#define CHECK(c) do { checks++; if (!(c)) { fails++; printf("  FAIL line %d: %s\n", __LINE__, #c); } } while (0)

static void run(uint32_t ms) { for (uint32_t t = 0; t < ms; t += 10) { HW.ms += 10; loop(); } }
static bool serialHas(const char* s) { return HW.serialOut.find(s) != std::string::npos; }
static int countSerial(const char* s) { int n = 0; size_t p = 0; while ((p = HW.serialOut.find(s, p)) != std::string::npos) { n++; p += strlen(s); } return n; }
static bool toneSeen(uint16_t f) { for (auto t : HW.toneLog) if (t == f) return true; return false; }
static int writesTo(int pin) { int n = 0; for (auto& w : Blynk.writes) if (w.pin == pin) n++; return n; }
static std::string lastWrite(int pin) { for (int i = (int)Blynk.writes.size() - 1; i >= 0; i--) if (Blynk.writes[i].pin == pin) return Blynk.writes[i].val; return ""; }
static void press(int idx, bool down) { HW.digital[MB_SENSOR_PINS[idx]] = down ? LOW : HIGH; }
static bool ledBlinks(int idx, uint32_t windowMs) {
  bool sawHigh = false, sawLow = false;
  for (uint32_t t = 0; t < windowMs; t += 10) { HW.ms += 10; loop(); (HW.digital[MB_LED_PINS[idx]] ? sawHigh : sawLow) = true; }
  return sawHigh && sawLow;
}
static void clearLog() { HW.serialOut.clear(); HW.toneLog.clear(); HW.tone = 0xFFFF; }

int main() {
  // idle inputs: buttons released (pull-up = HIGH), pots at 50 %
  for (int i = 0; i < 3; i++) { HW.digital[MB_SENSOR_PINS[i]] = HIGH; HW.adc[MB_STOCK_PINS[i]] = 2048; }
  HW.ms = 1000;
  setup();
  printf("[boot]\n");
  CHECK(serialHas("device_started"));
  CHECK(!serialHas("stock_empty"));
  CHECK(g_cloud == true);

  // ---- bring the cloud up
  WiFi.st = WL_CONNECTED; Blynk.connectWillSucceed = true;
  run(200);
  CHECK(Blynk.up);
  CHECK(lastWrite(8).find("online") == 0);
  run(4000);                                   // let the queue drain (1.5 s spacing)
  CHECK(writesTo(10) >= 1);                    // device_started reached V10

  printf("[scenario A: reminder]\n");
  clearLog();
  BlynkParam p; p.v = 1; blynk_write_V6(p);
  CHECK(serialHas("\"event_type\":\"reminder_started\""));
  CHECK(ledBlinks(0, 1200));
  CHECK(!ledBlinks(1, 600));
  CHECK(toneSeen(2000));
  CHECK(g_reminderComp == 1);
  p.v = 1; blynk_write_V6(p);                  // same command again must be ignored
  CHECK(countSerial("reminder_started") == 1);

  printf("[scenario B: correct lid opened]\n");
  Blynk.writes.clear(); clearLog();
  press(0, true); run(100);
  CHECK(serialHas("\"event_type\":\"compartment_opened\""));
  CHECK(serialHas("\"detail\":\"expected\""));
  CHECK(g_reminderComp == 0);
  CHECK(lastWrite(0) == "1");
  CHECK(lastWrite(6) == "0");                  // cloud command pin reset
  CHECK(HW.digital[MB_LED_PINS[0]] == HIGH);   // solid LED = interaction recorded
  CHECK(!serialHas("swallow"));
  run(4000);
  CHECK(HW.digital[MB_LED_PINS[0]] == LOW);
  press(0, false); run(100);
  CHECK(serialHas("compartment_closed"));
  CHECK(lastWrite(0) == "0");
  run(3000);

  printf("[debounce]\n");
  clearLog();
  press(1, true); run(20); press(1, false); run(200);   // 20 ms blip < 40 ms debounce
  CHECK(!serialHas("compartment_opened"));

  printf("[scenario C: wrong compartment]\n");
  Blynk.writes.clear(); clearLog();
  p.v = 2; blynk_write_V6(p);
  press(2, true); run(100);                    // open compartment 3 while 2 is active
  CHECK(serialHas("\"event_type\":\"wrong_compartment\""));
  CHECK(serialHas("expected=2"));
  CHECK(lastWrite(9) == "3");
  CHECK(toneSeen(700));
  CHECK(g_reminderComp == 2);                  // reminder keeps going
  CHECK(!serialHas("\"event_type\":\"compartment_opened\""));
  run(4000);
  press(2, false); run(100);
  p.v = 0; blynk_write_V6(p);
  CHECK(g_reminderComp == 0);
  CHECK(serialHas("cancelled_cloud"));

  printf("[scenario D: stock]\n");
  clearLog(); Blynk.writes.clear();
  HW.adc[MB_STOCK_PINS[0]] = 4095; run(2600);  // 100 % -> FULL
  CHECK(serialHas("MEDIUM->FULL"));
  clearLog();
  HW.adc[MB_STOCK_PINS[0]] = 800; run(2600);   // ~19 % -> LOW
  CHECK(serialHas("FULL->LOW"));
  clearLog();
  HW.adc[MB_STOCK_PINS[0]] = 0; run(1000);     // not yet confirmed
  CHECK(!serialHas("stock_empty"));
  run(1500);
  CHECK(serialHas("\"event_type\":\"stock_empty\""));
  CHECK(serialHas("\"sensor_value\":0"));
  CHECK(countSerial("stock_empty") == 1);
  CHECK(toneSeen(1200));
  CHECK(lastWrite(3) == "0");
  CHECK(!strcmp(stateLabel(0, HW.ms), "Medicine Refill Required"));
  run(6000);
  CHECK(countSerial("stock_empty") == 1);      // no repeat while it stays empty
  clearLog();
  HW.adc[MB_STOCK_PINS[0]] = 4095; run(2600);
  CHECK(serialHas("EMPTY->FULL"));

  printf("[stock noise near threshold must not flap]\n");
  clearLog();
  for (int i = 0; i < 40; i++) { HW.adc[MB_STOCK_PINS[1]] = (i % 2) ? 1250 : 1190; run(100); }   // ~30 % +/- 1
  CHECK(countSerial("stock_changed") <= 1);

  printf("[reminder timeout]\n");
  clearLog();
  p.v = 3; blynk_write_V6(p);
  run(MB_REMINDER_TIMEOUT_MS + 500);
  CHECK(serialHas("\"event_type\":\"reminder_missed\""));
  CHECK(g_reminderComp == 0);

  printf("[offline queue + spacing]\n");
  run(8000);                                   // drain whatever is left
  Blynk.up = false; Blynk.connectWillSucceed = false; Blynk.writes.clear();
  clearLog();
  p.v = 1; blynk_write_V6(p); run(50);
  press(0, true); run(100); press(0, false); run(100);   // 2 more events while offline
  size_t queuedBefore = g_qCount;
  CHECK(queuedBefore >= 3);
  CHECK(writesTo(10) == 0);                    // nothing sent while offline
  Blynk.connectWillSucceed = true;
  run(MB_BLYNK_RETRY_MS + 500);                // reconnect
  CHECK(Blynk.up);
  uint32_t t0 = HW.ms;
  run(10000);
  CHECK(g_qCount == 0);
  CHECK(writesTo(10) >= 3);
  CHECK((HW.ms - t0) >= 2 * MB_EVENT_SPACING_MS - 100);

  printf("[serial commands]\n");
  clearLog();
  for (const char* c = "r2\n"; *c; ++c) HW.serialIn.push_back(*c);
  run(50);
  CHECK(g_reminderComp == 2);
  for (const char* c = "s\n"; *c; ++c) HW.serialIn.push_back(*c);
  run(50);
  CHECK(serialHas("MediBridge status"));

  // dump every event line for the python JSON validator
  FILE* f = fopen("events_dump.jsonl", "w");
  for (auto& e : Blynk.allEvents) fprintf(f, "%s\n", e.c_str());
  fclose(f);

  printf("\n%d checks, %d failed\n", checks, fails);
  return fails ? 1 : 0;
}
