// Minimal fake Arduino/ESP32 API so the real sketch.ino can run on a PC.
#pragma once
#include <stdint.h>
#include <stdio.h>
#include <stdarg.h>
#include <string.h>
#include <string>
#include <deque>
#include <vector>
#include <time.h>
#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define ESP_ARDUINO_VERSION_MAJOR_DEFAULT 3
#ifndef ESP_ARDUINO_VERSION_MAJOR
#define ESP_ARDUINO_VERSION_MAJOR 3
#endif

struct FakeHw {
  uint32_t ms = 0;
  int digital[40] = {0};      // value read by digitalRead for inputs / written for outputs
  int adc[40] = {0};
  uint16_t tone = 0;
  std::vector<uint16_t> toneLog;
  std::string serialOut;
  std::deque<char> serialIn;
};
extern FakeHw HW;

inline uint32_t millis() { return HW.ms; }
inline void delay(uint32_t m) { HW.ms += m; }
inline void pinMode(int, int) {}
inline int digitalRead(int p) { return HW.digital[p]; }
inline void digitalWrite(int p, int v) { HW.digital[p] = v; }
inline int analogRead(int p) { return HW.adc[p]; }
inline void analogReadResolution(int) {}
inline uint32_t esp_random() { return 0xA1B2C3D4u; }
inline void configTime(long, int, const char*, const char* = nullptr) {}
inline void buzzerStubRecord(uint16_t f) { if (f != HW.tone) { HW.tone = f; HW.toneLog.push_back(f); } }
#if ESP_ARDUINO_VERSION_MAJOR >= 3
inline bool ledcAttach(int, int, int) { return true; }
#else
inline double ledcSetup(int, double, int) { return 0; }
inline void ledcAttachPin(int, int) {}
#endif
inline uint32_t ledcWriteTone(int, uint32_t f) { buzzerStubRecord((uint16_t)f); return f; }

struct FakeSerial {
  void begin(int) {}
  void print(const char* s) { HW.serialOut += s; }
  void println(const char* s = "") { HW.serialOut += s; HW.serialOut += "\n"; }
  void println(unsigned long v) { HW.serialOut += std::to_string(v) + "\n"; }
  void printf(const char* fmt, ...) { char b[512]; va_list a; va_start(a, fmt); vsnprintf(b, sizeof b, fmt, a); va_end(a); HW.serialOut += b; }
  int available() { return (int)HW.serialIn.size(); }
  int read() { int c = HW.serialIn.front(); HW.serialIn.pop_front(); return c; }
};
extern FakeSerial Serial;
