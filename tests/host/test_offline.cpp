// Same sketch compiled WITHOUT config.h -> must run in OFFLINE mode (Serial only).
#include "../../circuit/sketch.ino"
FakeHw HW; FakeSerial Serial; FakeWiFi WiFi;
static int fails = 0;
#define CHECK(c) do { if (!(c)) { fails++; printf("FAIL line %d: %s\n", __LINE__, #c); } } while (0)
int main() {
  for (int i = 0; i < 3; i++) { HW.digital[MB_SENSOR_PINS[i]] = HIGH; HW.adc[MB_STOCK_PINS[i]] = 2048; }
  HW.ms = 1000; setup();
  CHECK(HW.serialOut.find("OFFLINE mode") != std::string::npos);
  for (const char* c = "r1\n"; *c; ++c) HW.serialIn.push_back(*c);
  for (int i = 0; i < 20; i++) { HW.ms += 10; loop(); }
  CHECK(g_reminderComp == 1);
  HW.digital[MB_SENSOR_PINS[0]] = LOW;
  for (int i = 0; i < 20; i++) { HW.ms += 10; loop(); }
  CHECK(HW.serialOut.find("\"event_type\":\"compartment_opened\"") != std::string::npos);
  CHECK(g_qCount == 0);       // nothing queued for a cloud that does not exist
  printf("offline test: %s\n", fails ? "FAILED" : "passed");
  return fails ? 1 : 0;
}
