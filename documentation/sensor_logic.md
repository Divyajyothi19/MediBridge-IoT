# Sensor and behaviour logic

## Lid sensors
Read every loop, debounced 40 ms. Press edge → `onLidOpened`, release edge → `onLidClosed`.

| Situation when a lid opens | Result |
|---|---|
| Reminder active for this compartment | `compartment_opened` (`expected`), reminder stops, LED solid 3 s, V6 reset to 0 |
| No reminder active | `compartment_opened` (`no_active_reminder`), LED solid 3 s |
| Reminder active for a **different** compartment | `wrong_compartment` (`expected=N`), fast LED + fast beeps 3 s, V9 = opened id, reminder **keeps running** |

## Reminder
Start: V6 = 1..3 (or Serial `r1..r3`) → LED blink + buzzer + `reminder_started`. Stop: right lid, V6 = 0, or timeout (`reminder_missed` after 5 min). Mute (V7 = 0) silences sound only.

## Stock (simulation)
1. 8 ADC samples averaged every 200 ms → 0–100 % (`MB_ADC_RAW_EMPTY/FULL`).
2. Status: FULL ≥ 60, MEDIUM ≥ 30, LOW ≥ 10, else EMPTY (all configurable).
3. Going **fuller** needs +3 % extra (hysteresis) so a shaky reading does not flap.
4. A new status must hold **2 s** before it counts.
5. EMPTY → `stock_empty` event, V3-5 update, short beeps, LED blips, state "Medicine Refill Required". The backend turns that event into the caregiver e-mail.

Knob guide (default scaling): below ~10 % = EMPTY, ~10–29 % LOW, ~30–59 % MEDIUM, 60 %+ FULL.
Real ESP32 ADCs are not perfectly linear near 0 V and 3.3 V; calibrate `MB_ADC_RAW_EMPTY/FULL` on real hardware.

## LED priority
wrong-compartment flicker > reminder blink > solid "recorded" > empty blip > off.
