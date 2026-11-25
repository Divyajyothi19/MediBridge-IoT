# Future extensions (NOT implemented in this version)

**Voice guidance (visually impaired)** – done in the React app, not the ESP32: browser speech synthesis driven by the same events (`reminder_started`, `wrong_compartment`, `stock_changed/empty`). Needs: message catalogue per language (English first; Kannada added as a second catalogue, voice availability depends on the device), volume and language settings stored per user.

**Vibration band** – a BLE wearable (ESP32 + vibration motor). Triggered by the backend from the same events; patterns proposed: reminder = 3 short pulses, wrong compartment = rapid pulses, missed = long pulse, repeated. The box firmware needs no change; either the phone/backend relays to the band, or the band subscribes over BLE later. No wearable code exists yet.

**Visual accessibility** – large labels, high contrast, icons plus text (never colour alone), large touch targets. Palette: soft blue, teal, mint, lavender, warm yellow. The box illustration is the home screen. The firmware already exposes the labels the UI needs (state names in `API_CONTRACT.md`).

**Real hardware** – HX711 load cells, reed switches + magnets, transistor-driven buzzer, RTC or NTP (NTP already used), power supply and enclosure.
