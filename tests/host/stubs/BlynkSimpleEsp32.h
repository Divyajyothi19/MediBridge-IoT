// Fake Blynk library: records every virtualWrite so tests can inspect them.
#pragma once
#include "WiFi.h"
#include <string>
#include <vector>
#define V0 0
#define V1 1
#define V2 2
#define V3 3
#define V4 4
#define V5 5
#define V6 6
#define V7 7
#define V8 8
#define V9 9
#define V10 10
#define V11 11
struct BlynkParam { int v = 0; int asInt() const { return v; } };
#define BLYNK_WRITE(pin) void blynk_write_##pin(BlynkParam& param)
#define BLYNK_CONNECTED() void blynk_connected_cb()
void blynk_connected_cb();
void blynk_write_V6(BlynkParam& param);
void blynk_write_V7(BlynkParam& param);
struct BlynkWrite { int pin; std::string val; };
struct FakeBlynk {
  bool up = false;
  bool connectWillSucceed = false;
  int connectCalls = 0;
  std::vector<BlynkWrite> writes;
  std::vector<std::string> allEvents;   // every V10 write, never cleared
  void config(const char*) {}
  bool connected() { return up; }
  bool connect(int) { connectCalls++; if (connectWillSucceed) { up = true; blynk_connected_cb(); } return up; }
  void run() {}
  void virtualWrite(int pin, int v) { writes.push_back({pin, std::to_string(v)}); }
  void virtualWrite(int pin, const char* s) { writes.push_back({pin, s}); if (pin == 10) allEvents.push_back(s); }
};
extern FakeBlynk Blynk;
