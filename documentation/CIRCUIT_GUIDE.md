# Circuit Guide — MediBridge IoT

> [!NOTE]
> This is a **virtual simulation**. No physical hardware required. All components run inside [wokwi.com](https://wokwi.com).

---

## Pin Mapping Table

| GPIO | Component | ID | Purpose |
|------|-----------|----|---------|
| D25 | Push Button (Green) | btn1 | Compartment 1 lid sensor |
| D26 | Push Button (Yellow) | btn2 | Compartment 2 lid sensor |
| D27 | Push Button (Blue) | btn3 | Compartment 3 lid sensor |
| D18 | LED (Green) + 220Ω resistor | led1, r1 | Compartment 1 status indicator |
| D19 | LED (Yellow) + 220Ω resistor | led2, r2 | Compartment 2 status indicator |
| D21 | LED (Blue) + 220Ω resistor | led3, r3 | Compartment 3 status indicator |
| D34 | Potentiometer | pot1 | Compartment 1 stock level (ADC1) |
| D35 | Potentiometer | pot2 | Compartment 2 stock level (ADC1) |
| D32 | Potentiometer | pot3 | Compartment 3 stock level (ADC1) |
| D23 | Passive Buzzer | bz1 | Audio alerts and reminders |
| 3V3 | — | — | Potentiometer power (VCC) |
| GND | — | — | Common ground |

> [!TIP]
> ADC1 pins (D32, D34, D35) are used for potentiometers because ADC2 is disabled when WiFi is active on ESP32.

---

## Component List (Wokwi Types)

| Wokwi Type | Count | Description |
|-----------|-------|-------------|
| `wokwi-esp32-devkit-v1` | 1 | Main microcontroller |
| `wokwi-pushbutton` | 3 | Simulates lid reed switches; active LOW with INPUT_PULLUP |
| `wokwi-led` | 3 | Compartment status LEDs (green/yellow/blue) |
| `wokwi-resistor` | 3 | 220Ω current-limiting resistors for LEDs |
| `wokwi-potentiometer` | 3 | Simulates medication stock weight (0–100%) |
| `wokwi-buzzer` | 1 | Audio feedback (volume set to 0.1 to avoid distortion) |

---

## Circuit Behavior

### Buttons (Lid Sensors)
- Wired between GPIO and GND; firmware uses `INPUT_PULLUP`
- **Pressed = LOW = "lid opened"** (`MB_SENSOR_ACTIVE_LEVEL LOW`)
- 40 ms debounce (`MB_DEBOUNCE_MS`)
- Triggers `compartment_opened`, `compartment_closed`, or `wrong_compartment` events

### Potentiometers (Stock Simulation)
- SIG pin → ESP32 ADC1 → 12-bit reading (0–4095)
- Converted to 0–100% stock level
- **Turn left** = less stock / empty
- **Turn right** = full stock
- 2-second confirmation window before status changes (prevents noise events)
- Reports when stock crosses thresholds: FULL (≥60%), MEDIUM (≥30%), LOW (≥10%), EMPTY (<10%)
- Hysteresis of 3% prevents flip-flopping near thresholds

### LEDs (Compartment Status)
| Blink Pattern | Meaning |
|--------------|---------|
| **Steady ON** (3 s after button press) | Interaction recorded successfully |
| **Slow blink** (500 ms on/off) | Reminder is active for this compartment |
| **Fast flicker** (120 ms) | Wrong compartment opened — warning! |
| **Short blip** (100 ms every 2 s) | Stock is EMPTY — refill needed |
| **OFF** | Idle / normal |

### Buzzer Patterns
| Pattern | Frequencies | Description |
|---------|------------|-------------|
| `P_REMINDER` | 2000 Hz beeps | Pulsing reminder — take your medicine |
| `P_WARNING` | 700 Hz rapid | Wrong compartment opened |
| `P_ALERT` | 1200 Hz beeps | Stock empty alert |
| `P_TEST` | 1500 Hz (1 s) | Manual test beep (type `b` in Serial Monitor) |
| OFF | — | No active alert |

---

## Potentiometer Stock Simulation Explanation

Each potentiometer physically represents the **weight of medicine** in a compartment:
- In a real device, this would be replaced by a load cell + HX711 amplifier
- The firmware's `StockSensor` class is designed to be swapped out — the potentiometer and load cell use the same interface
- Turn a potentiometer **counterclockwise** to simulate medicine running out
- The `stock_empty` event fires when the compartment drops below 10% and stays there for 2 seconds

---

## Serial Monitor Commands

Connect at **115200 baud**. Type commands in the Serial Monitor input:

| Command | Action |
|---------|--------|
| `r1` | Start reminder for compartment 1 |
| `r2` | Start reminder for compartment 2 |
| `r3` | Start reminder for compartment 3 |
| `r0` | Cancel active reminder |
| `m` | Mute buzzer until next reminder |
| `b` | Test beep |
| `s` | Print full status |
| `h` or `?` | Show help |

---

## Event JSON Format

Each event is a compact JSON string ≤ 256 bytes sent to Blynk V10:

```json
{
  "schema": 1,
  "event_id": "MB-WOKWI-DEMO-a1b2c3d4-0001",
  "device_id": "MB-WOKWI-DEMO",
  "compartment_id": 1,
  "event_type": "compartment_opened",
  "sensor_value": 1,
  "timestamp": "2024-01-15T08:30:00Z",
  "time_synced": true,
  "uptime_ms": 12345,
  "detail": "expected"
}
```

### Event Types
| Event | Trigger |
|-------|---------|
| `device_started` | Boot complete |
| `compartment_opened` | Button pressed |
| `compartment_closed` | Button released |
| `wrong_compartment` | Opened wrong compartment during reminder |
| `reminder_started` | Reminder command received (Blynk V6 or Serial) |
| `reminder_stopped` | Reminder cancelled or acknowledged |
| `reminder_missed` | 5 minutes passed without opening the right compartment |
| `stock_changed` | Stock crossed a threshold (FULL/MEDIUM/LOW/EMPTY) |
| `stock_empty` | Stock dropped below 10% |
