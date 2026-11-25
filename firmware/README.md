# Firmware guide

Files (all in `circuit/`):
* `sketch.ino` – the program: sensors, LEDs, buzzer, reminders, events, Blynk.
* `medibridge_config.h` – pins, thresholds, timings. **Change settings here.**
* `medibridge_logic.h` – stock model, debounce, wrong-compartment decision, JSON builder. No Arduino code → unit-tested on a PC.
* `config.example.h` → copy to `config.h` for secrets (git-ignored).

## Modes
| Mode | When | Behaviour |
|---|---|---|
| OFFLINE | no `config.h`, or token still says `PASTE_` | Everything works; events only on Serial |
| Cloud | real token in `config.h` | WiFi + Blynk, events queued and sent to V10 |

## Serial Monitor commands (115200 baud)
`r1` `r2` `r3` start reminder · `r0` cancel · `m` mute buzzer · `b` buzzer test · `s` status · `h` help

## LED and buzzer meaning
| Situation | LED | Buzzer |
|---|---|---|
| Reminder for compartment N | N blinks 0.5 s | two beeps, pause, repeat |
| Wrong compartment opened | that LED flickers fast (3 s) | fast low beeps (3 s) |
| Interaction recorded | solid 3 s | – |
| Stock EMPTY | short blip every 2 s | short beeps for 2.5 s, once |

## Replacing the potentiometer with a real load cell later
`sketch.ino` reads stock through `StockSensor::readPercent(idx)`. Write `class Hx711StockSensor : public StockSensor`
that reads the HX711, maps the weight to 0–100 % with `mb::rawToPercent(raw, rawEmpty, rawFull)` (calibrate those two numbers),
and set `g_stockSensor = &myHx711Sensor;`. Nothing else changes. **Not implemented in this version.**
The potentiometer is a *simulation*; it does not measure medicine.

## Replacing buttons with reed switches
Same pins. Check `MB_SENSOR_ACTIVE_LEVEL` (see `pin_mapping.md`).

## Honest limits
* One active reminder at a time (a new one replaces the old one).
* The firmware has no clock schedule; the backend decides *when* (it sends V6).
* While connecting to Blynk the loop can pause up to 2 s, once every 15 s, only while the cloud is unreachable.
* Event delivery to Blynk is best-effort (no acknowledgement). See `blynk/integration_guide.md`.
