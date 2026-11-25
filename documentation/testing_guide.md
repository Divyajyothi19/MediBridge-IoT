# Testing guide

## A. Status checklist (honest)
| Item | Status |
|---|---|
| Pure logic: stock thresholds, hysteresis, debounce, wrong-compartment decision, JSON builder | ✅ **Tested** on PC (45 checks) |
| Real `sketch.ino` run against a fake Arduino + fake Blynk: scenarios A–D, debounce, reminder timeout, offline queue + 1.5 s spacing, serial commands, offline mode | ✅ **Tested** on PC (53 checks). This is a logic test, not a Wokwi run |
| Every event JSON from that run parses and has all fields, < 256 bytes, unique ids | ✅ Tested (19 events) |
| `diagram.json` is valid JSON, all wire ends exist | ✅ Checked against my own pin-name list |
| Compile for the real ESP32 core + Blynk library | ❌ **Not done.** My environment cannot download the ESP32 toolchain. Wokwi compiles it for you when you press Start; send me any error |
| Running in Wokwi (LED, buzzer, buttons, pots) | ❌ **Needs you** (manual steps below) |
| WiFi + Blynk connection, V10/V6 round trip | ❌ **Needs your Blynk account + internet** |
| Gmail e-mail | ❌ Not built (backend stage). Nothing sends e-mail in this version |
| Wokwi `Wokwi-GUEST` internet access | Per Wokwi docs the simulated WiFi has full internet access; I could not test it myself |

Re-run the PC tests anytime: `bash tests/host/run_tests.sh` (needs g++ and python3). The fake token in `tests/host/cloud_cfg/config.h` is not real.

## B. Manual test 1 – no cloud (do this first)
1. Open https://wokwi.com → sign in → **New Project → ESP32 → Arduino**.
2. Add/replace these files from `circuit/` (use the file-tab menu to add a file, or paste the content): `sketch.ino`, `diagram.json`, `libraries.txt`, `medibridge_config.h`, `medibridge_logic.h`. Do **not** create `config.h` yet.
3. Press the green **Start** button. Serial Monitor should say `OFFLINE mode`, show `device_started`, and all 3 LEDs flash once with a short beep.
4. **Reminder:** type `r1` + Enter in the Serial Monitor → LED 1 blinks, buzzer beeps, `reminder_started` printed.
5. **Correct lid:** click and hold button 1 for half a second → `compartment_opened ... expected`, LED 1 solid 3 s, beeping stops.
6. **Wrong lid:** type `r2`, then press button 3 → `wrong_compartment ... expected=2`, fast flicker on LED 3, fast beeps for 3 s; LED 2 keeps blinking.
7. **Stock:** drag potentiometer 1 to the far left (0 %) and wait 2 s → `stock_empty`, short beeps, LED 1 blips every 2 s. Drag it back right → `stock_changed ... EMPTY->...`.
8. Type `s` for a status table, `h` for help.

## C. Manual test 2 – with Blynk
1. Finish `blynk/device_setup.md`, create `config.h` in the Wokwi project (new file, paste your edited `config.example.h`).
2. Start. Expect `[NET] WiFi connected`, `[NET] Blynk connected`. Blynk Console shows the device Online and V8 = `online fw=1.0.0`.
3. In a browser open `https://blynk.cloud/external/api/update?token=YOURTOKEN&v6=1` → LED 1 blinks in Wokwi.
4. Press button 1 → V10 in Console/`.../external/api/get?token=YOURTOKEN&v10` shows the JSON, V0 = 1, V6 back to 0.
5. Repeat the wrong-compartment and empty-stock steps; check V9, V3–V5, V10.
6. Disconnect test: stop and restart the simulation without internet or with a wrong token → it keeps working, events are queued.
If WiFi never connects in Wokwi: confirm SSID `Wokwi-GUEST`, empty password, channel 6, and that the browser tab stays open.

## D. If something fails
Copy the full red error from Wokwi or the Serial output and send it to me. Likely trouble spots: the Blynk library version vs. the ESP32 core Wokwi uses, and `esp_random` include.
