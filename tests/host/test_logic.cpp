// Unit tests for circuit/medibridge_logic.h (no Arduino needed).
#include "../../circuit/medibridge_logic.h"
#include <stdio.h>
#include <string.h>
static int fails = 0, checks = 0;
#define CHECK(c) do { checks++; if (!(c)) { fails++; printf("FAIL line %d: %s\n", __LINE__, #c); } } while (0)
int main() {
  using namespace mb;
  StockThresholds t = {60, 30, 10, 3, 2000};
  CHECK(rawToPercent(0, 0, 4095) == 0);
  CHECK(rawToPercent(4095, 0, 4095) == 100);
  CHECK(rawToPercent(2048, 0, 4095) == 50);
  CHECK(rawToPercent(-50, 0, 4095) == 0);
  CHECK(rawToPercent(9999, 0, 4095) == 100);
  CHECK(rawToPercent(5, 10, 10) == 0);
  CHECK(classifyStock(100, t) == STOCK_FULL);
  CHECK(classifyStock(60, t) == STOCK_FULL);
  CHECK(classifyStock(59, t) == STOCK_MEDIUM);
  CHECK(classifyStock(30, t) == STOCK_MEDIUM);
  CHECK(classifyStock(29, t) == STOCK_LOW);
  CHECK(classifyStock(10, t) == STOCK_LOW);
  CHECK(classifyStock(9, t) == STOCK_EMPTY);
  CHECK(classifyStock(0, t) == STOCK_EMPTY);
  // hysteresis: LOW -> MEDIUM only at 33 %, not 30 %
  CHECK(classifyWithHysteresis(30, STOCK_LOW, t) == STOCK_LOW);
  CHECK(classifyWithHysteresis(32, STOCK_LOW, t) == STOCK_LOW);
  CHECK(classifyWithHysteresis(33, STOCK_LOW, t) == STOCK_MEDIUM);
  CHECK(classifyWithHysteresis(5, STOCK_LOW, t) == STOCK_EMPTY);   // going down is immediate
  CHECK(classifyWithHysteresis(12, STOCK_EMPTY, t) == STOCK_EMPTY);
  CHECK(classifyWithHysteresis(13, STOCK_EMPTY, t) == STOCK_LOW);
  // tracker: needs the confirm time
  StockTracker tr; tr.init(100, t);
  CHECK(tr.status() == STOCK_FULL);
  CHECK(!tr.update(0, 1000));
  CHECK(!tr.update(0, 2500));
  CHECK(tr.update(0, 3000));
  CHECK(tr.status() == STOCK_EMPTY);
  CHECK(!tr.update(0, 4000));                                   // no repeat
  // glitch shorter than confirm time is ignored
  StockTracker g; g.init(100, t);
  CHECK(!g.update(0, 0)); CHECK(!g.update(100, 500)); CHECK(!g.update(100, 5000));
  CHECK(g.status() == STOCK_FULL);
  // millis() wrap-around
  StockTracker w; w.init(100, t);
  CHECK(!w.update(0, 0xFFFFFF00u)); CHECK(w.update(0, 0xFFFFFF00u + 2100u));
  // debounce
  Debouncer d(40); d.init(false, 0);
  CHECK(!d.update(true, 10)); CHECK(!d.update(false, 20)); CHECK(!d.update(false, 100));
  CHECK(!d.update(true, 200)); CHECK(d.update(true, 241)); CHECK(d.stable());
  // interaction decision
  CHECK(classifyOpen(0, 2) == OPEN_NO_REMINDER);
  CHECK(classifyOpen(2, 2) == OPEN_EXPECTED);
  CHECK(classifyOpen(2, 3) == OPEN_WRONG);
  // json
  char buf[256];
  EventFields e = {"MB-1-0000abcd-0001", "MB-1", 2, "stock_empty", 0, "2026-11-24T10:15:30Z", true, 12345, "FULL->EMPTY"};
  size_t n = buildEventJson(buf, sizeof buf, e);
  CHECK(n > 0 && n < 256 && n == strlen(buf));
  CHECK(strstr(buf, "\"event_type\":\"stock_empty\"") != nullptr);
  e.timestamp = ""; e.timeSynced = false; e.detail = "quote\"back\\slash";
  n = buildEventJson(buf, sizeof buf, e);
  CHECK(n > 0 && strstr(buf, "\"timestamp\":null") && strstr(buf, "quote\\\"back\\\\slash"));
  char tiny[20];
  CHECK(buildEventJson(tiny, sizeof tiny, e) == 0);             // too small -> reports failure
  printf("logic tests: %d checks, %d failed\n", checks, fails);
  return fails ? 1 : 0;
}
