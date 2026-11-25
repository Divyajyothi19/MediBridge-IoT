// MediBridge — hardware-independent logic (NO Arduino calls in this file).
// Kept separate so it can be unit-tested on a normal computer (see tests/host).
#pragma once
#include <stdint.h>
#include <stdio.h>
#include <stddef.h>

namespace mb {

// ---------------------------------------------------------------- stock model
// Order matters: smaller number = fuller.
enum StockStatus : uint8_t { STOCK_FULL = 0, STOCK_MEDIUM = 1, STOCK_LOW = 2, STOCK_EMPTY = 3 };

struct StockThresholds {
  uint8_t  fullMin;     // percent >= fullMin   -> FULL
  uint8_t  mediumMin;   // percent >= mediumMin -> MEDIUM
  uint8_t  lowMin;      // percent >= lowMin    -> LOW, below -> EMPTY
  uint8_t  hysteresis;  // extra percent needed to move to a FULLER status
  uint32_t confirmMs;   // a new status must hold this long before it counts
};

inline const char* stockStatusName(StockStatus s) {
  switch (s) {
    case STOCK_FULL:   return "FULL";
    case STOCK_MEDIUM: return "MEDIUM";
    case STOCK_LOW:    return "LOW";
    default:           return "EMPTY";
  }
}

// Convert a raw sensor reading to 0..100 %. Works for the potentiometer (ADC)
// and can be reused for a load cell calibrated to rawEmpty / rawFull.
inline uint8_t rawToPercent(int32_t raw, int32_t rawEmpty, int32_t rawFull) {
  if (rawFull == rawEmpty) return 0;
  int64_t p = ((int64_t)(raw - rawEmpty) * 100) / (rawFull - rawEmpty);
  if (p < 0) p = 0;
  if (p > 100) p = 100;
  return (uint8_t)p;
}

inline StockStatus classifyStock(uint8_t pct, const StockThresholds& t) {
  if (pct >= t.fullMin)   return STOCK_FULL;
  if (pct >= t.mediumMin) return STOCK_MEDIUM;
  if (pct >= t.lowMin)    return STOCK_LOW;
  return STOCK_EMPTY;
}

// Going DOWN (emptier) happens at the plain threshold.
// Going UP (fuller) needs `hysteresis` extra percent, so a wobbling reading
// near a threshold does not flip the status back and forth.
inline StockStatus classifyWithHysteresis(uint8_t pct, StockStatus cur, const StockThresholds& t) {
  StockStatus raw = classifyStock(pct, t);
  if (raw < cur) {  // candidate is fuller than current
    uint8_t shifted = (pct >= t.hysteresis) ? (uint8_t)(pct - t.hysteresis) : 0;
    StockStatus up = classifyStock(shifted, t);
    return (up < cur) ? up : cur;
  }
  return raw;
}

class StockTracker {
 public:
  StockTracker() : t_{60, 30, 10, 3, 2000}, status_(STOCK_FULL), candidate_(STOCK_FULL),
                   pending_(false), since_(0), percent_(100) {}
  void init(uint8_t pct, const StockThresholds& t) {
    t_ = t; percent_ = pct; status_ = classifyStock(pct, t); pending_ = false;
  }
  // Returns true exactly once when a NEW status has been confirmed.
  bool update(uint8_t pct, uint32_t nowMs) {
    percent_ = pct;
    StockStatus cand = classifyWithHysteresis(pct, status_, t_);
    if (cand == status_) { pending_ = false; return false; }
    if (!pending_ || cand != candidate_) { pending_ = true; candidate_ = cand; since_ = nowMs; return false; }
    if ((uint32_t)(nowMs - since_) >= t_.confirmMs) { status_ = cand; pending_ = false; return true; }
    return false;
  }
  StockStatus status() const { return status_; }
  uint8_t percent() const { return percent_; }
 private:
  StockThresholds t_;
  StockStatus status_, candidate_;
  bool pending_;
  uint32_t since_;
  uint8_t percent_;
};

// ------------------------------------------------------------------ debounce
class Debouncer {
 public:
  explicit Debouncer(uint16_t ms = 40) : ms_(ms), stable_(false), lastRaw_(false), changedAt_(0) {}
  void init(bool raw, uint32_t now) { stable_ = raw; lastRaw_ = raw; changedAt_ = now; }
  bool stable() const { return stable_; }
  // Returns true when the stable state has just changed.
  bool update(bool raw, uint32_t now) {
    if (raw != lastRaw_) { lastRaw_ = raw; changedAt_ = now; }
    if (raw != stable_ && (uint32_t)(now - changedAt_) >= ms_) { stable_ = raw; return true; }
    return false;
  }
 private:
  uint16_t ms_;
  bool stable_, lastRaw_;
  uint32_t changedAt_;
};

// ------------------------------------------------------- interaction decision
enum OpenKind : uint8_t { OPEN_NO_REMINDER = 0, OPEN_EXPECTED = 1, OPEN_WRONG = 2 };

// activeReminder: 0 = none, otherwise compartment id 1..3.
inline OpenKind classifyOpen(uint8_t activeReminder, uint8_t opened) {
  if (activeReminder == 0) return OPEN_NO_REMINDER;
  return (activeReminder == opened) ? OPEN_EXPECTED : OPEN_WRONG;
}

// ---------------------------------------------------------------- event JSON
struct EventFields {
  const char* eventId;
  const char* deviceId;
  uint8_t     compartmentId;   // 0 = whole device
  const char* eventType;
  long        sensorValue;
  const char* timestamp;       // ISO-8601 UTC, or "" when the clock is not synced
  bool        timeSynced;
  unsigned long uptimeMs;
  const char* detail;
};

struct JsonOut {
  char* b; size_t n; size_t len; bool ok;
  JsonOut(char* buf, size_t size) : b(buf), n(size), len(0), ok(true) { if (n) b[0] = 0; }
  void raw(const char* s) {
    while (*s) { if (len + 1 >= n) { ok = false; return; } b[len++] = *s++; }
    b[len] = 0;
  }
  void str(const char* s) {
    raw("\"");
    for (; *s; ++s) {
      char c = *s;
      if (c == '"' || c == '\\') { char t[3] = {'\\', c, 0}; raw(t); }
      else if ((unsigned char)c < 0x20) { raw("?"); }
      else { char t[2] = {c, 0}; raw(t); }
    }
    raw("\"");
  }
  void num(long v) { char t[24]; snprintf(t, sizeof t, "%ld", v); raw(t); }
};

// Compact JSON (no spaces) so it stays under Blynk's 256-byte message limit.
// Returns length, or 0 if the buffer was too small.
inline size_t buildEventJson(char* buf, size_t size, const EventFields& e) {
  JsonOut o(buf, size);
  o.raw("{\"schema\":1,\"event_id\":");     o.str(e.eventId);
  o.raw(",\"device_id\":");                 o.str(e.deviceId);
  o.raw(",\"compartment_id\":");            o.num(e.compartmentId);
  o.raw(",\"event_type\":");                o.str(e.eventType);
  o.raw(",\"sensor_value\":");              o.num(e.sensorValue);
  o.raw(",\"timestamp\":");                 if (e.timestamp && e.timestamp[0]) o.str(e.timestamp); else o.raw("null");
  o.raw(",\"time_synced\":");               o.raw(e.timeSynced ? "true" : "false");
  o.raw(",\"uptime_ms\":");                 o.num((long)e.uptimeMs);
  o.raw(",\"detail\":");                    o.str(e.detail ? e.detail : "");
  o.raw("}");
  return o.ok ? o.len : 0;
}

}  // namespace mb
