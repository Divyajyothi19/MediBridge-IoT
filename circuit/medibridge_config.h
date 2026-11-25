// MediBridge — NON-SECRET settings: pins, thresholds, timings.
// Secrets (WiFi, Blynk token) live in config.h (copy of config.example.h), NOT here.
#pragma once
#include <stdint.h>
#include "medibridge_logic.h"

#define MB_FW_VERSION          "1.0.0"
#define MB_NUM_COMPARTMENTS    3

// ---- Pin map (ESP32 DevKit). No boot-strapping pins (0,2,5,12,15) are used.
static const uint8_t MB_SENSOR_PINS[MB_NUM_COMPARTMENTS] = {25, 26, 27};  // lid sensors / buttons
static const uint8_t MB_LED_PINS[MB_NUM_COMPARTMENTS]    = {18, 19, 21};  // compartment LEDs
static const uint8_t MB_STOCK_PINS[MB_NUM_COMPARTMENTS]  = {34, 35, 32};  // ADC1 only (ADC2 breaks when WiFi is on)
static const uint8_t MB_BUZZER_PIN = 23;

// ---- Lid sensor
// Button / reed switch wired between GPIO and GND with INPUT_PULLUP:
//   pressed (LOW) = "lid opened". If your real reed switch is CLOSED while the lid
//   is shut, change this to HIGH.
#define MB_SENSOR_ACTIVE_LEVEL LOW
#define MB_DEBOUNCE_MS         40

// ---- Stock estimation (SIMULATION: potentiometer, NOT a real weight measurement)
#define MB_ADC_RAW_EMPTY       0      // ADC reading that means 0 %
#define MB_ADC_RAW_FULL        4095   // ADC reading that means 100 %
#define MB_STOCK_FULL_MIN      60     // % -> FULL
#define MB_STOCK_MEDIUM_MIN    30     // % -> MEDIUM
#define MB_STOCK_LOW_MIN       10     // % -> LOW ; below this -> EMPTY
#define MB_STOCK_HYSTERESIS    3      // extra % needed to go to a fuller status
#define MB_STOCK_CONFIRM_MS    2000   // status must hold this long before an event is sent
#define MB_STOCK_POLL_MS       200
#define MB_STOCK_REPORT_DELTA  10     // also publish % when it moved this much (saves Blynk messages)

// ---- Behaviour timings
#define MB_REMINDER_TIMEOUT_MS 300000UL  // 5 min without opening the right lid -> reminder_missed
#define MB_WARNING_MS          3000      // wrong-compartment warning length
#define MB_CONFIRM_LED_MS      3000      // solid LED after an interaction is recorded
#define MB_EMPTY_ALERT_MS      2500      // short beeps when a compartment becomes empty

// ---- Cloud behaviour
#define MB_EXTENDED_PINS       1         // 1 = also write V0-V5 and V9 (needs 12 datastreams).
                                         // 0 = core mode, only V6,V7,V8,V10,V11 (5 datastreams).
#define MB_EVENT_SPACING_MS    1500      // min gap between events sent to Blynk
#define MB_HEARTBEAT_MS        300000UL  // V11 uptime heartbeat (5 min keeps you inside the free message quota)
#define MB_BLYNK_RETRY_MS      5000UL
#define MB_WIFI_RETRY_MS       20000UL
#define MB_EVENT_QUEUE_SIZE    16
#define MB_EVENT_JSON_MAX      256       // Blynk's default max message size

// ---- Demo compartment data (the real values will be owned by the backend)
struct MbCompartmentInfo { const char* name; const char* dosage; const char* schedule; };
static const MbCompartmentInfo MB_COMPARTMENTS[MB_NUM_COMPARTMENTS] = {
  {"Medicine A", "1 tablet", "08:00"},
  {"Medicine B", "2 tablets", "14:00"},
  {"Medicine C", "1 capsule", "20:00"},
};
