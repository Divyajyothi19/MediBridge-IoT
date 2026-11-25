#!/usr/bin/env bash
# Run from anywhere:  bash tests/host/run_tests.sh
set -e
cd "$(dirname "$0")"
FLAGS="-std=c++17 -Wall -Wextra -Wno-unused-parameter -Wno-unused-function -Wno-unused-variable"
echo "== 1/4 pure logic";            g++ $FLAGS -o /tmp/mb_logic test_logic.cpp && /tmp/mb_logic
echo "== 2/4 sketch, cloud mode";    g++ $FLAGS -Istubs -Icloud_cfg -o /tmp/mb_scen test_scenarios.cpp && /tmp/mb_scen
echo "== 3/4 event JSON contract";   python3 validate_events.py
echo "== 4/4 sketch, offline mode";  g++ $FLAGS -Istubs -o /tmp/mb_off test_offline.cpp && /tmp/mb_off
echo "== extra: compile-check legacy ESP32 core 2.x API branch"
g++ $FLAGS -DESP_ARDUINO_VERSION_MAJOR=2 -Istubs -Icloud_cfg -fsyntax-only test_scenarios.cpp
echo "ALL HOST TESTS PASSED"
