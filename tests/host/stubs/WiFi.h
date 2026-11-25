#pragma once
#include "Arduino.h"
#define WL_CONNECTED 3
#define WL_DISCONNECTED 6
#define WIFI_STA 1
struct FakeIP { };
inline void operator<<(FakeSerial&, const FakeIP&) {}
struct FakeWiFi {
  int st = WL_DISCONNECTED;
  int beginCalls = 0;
  void mode(int) {}
  void setAutoReconnect(bool) {}
  void begin(const char*, const char*, int) { beginCalls++; }
  void disconnect() {}
  int status() { return st; }
  const char* localIP() { return "10.10.0.2"; }
};
extern FakeWiFi WiFi;
