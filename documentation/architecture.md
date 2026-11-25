# Architecture

```
 [ ESP32 firmware ]  --events V10, state V0-V5/V8/V9/V11-->  [ Blynk Cloud ]
   sensors, LEDs, buzzer   <--commands V6, V7--                    ^   |
                                                                   |   | HTTPS API (token, server side only)
                                                              [ FastAPI backend ] -- SQLite/Postgres
                                                                   |        \-- Gmail SMTP (caregiver e-mail)
                                                              WebSocket / REST
                                                                   |
                                                              [ React app ]  (no Blynk token)
```

Layers (kept separate on purpose)
1. **Device firmware** (`circuit/`): reads sensors, drives outputs, makes events. Knows nothing about patients, e-mail or schedules.
2. **Cloud transport** (Blynk): moves small messages. Replaceable (the event JSON is the contract, not Blynk).
3. **Application logic** (backend, later): schedules, patients, rules, notifications, history.
4. **UI** (React, later): talks only to the backend.

Hardware independence: pins and thresholds in `medibridge_config.h`; stock input behind `StockSensor`; lid input behind one `MB_SENSOR_ACTIVE_LEVEL`. The Wokwi circuit and real hardware use the same firmware.

Reliability choices: offline mode, event queue, unique event ids, debounce, stock confirm-time + hysteresis, non-blocking WiFi/Blynk reconnect.
