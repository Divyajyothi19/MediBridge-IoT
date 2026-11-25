# Blynk setup (step by step)

Menu names in Blynk change sometimes. If a button is not where I say, look for the same word nearby.

## 1. Account and template
1. Go to https://blynk.cloud and sign up (free).
2. Open **Developer Zone → My Templates → + New Template**.
3. Name: `MediBridge`. Hardware: **ESP32**. Connection type: **WiFi**. Click **Done**.
4. Open the template → **Datastreams** tab → **+ New Datastream → Virtual Pin**. Create every row of `datastream_mapping.md`
   (at least the 5 core ones). For each: choose the Virtual Pin number, name, data type, min/max.
5. Click **Save** (top right) every time you finish a change.

## 2. Create the device
1. **Devices → + New Device → From template → MediBridge** → name it `medibridge-sim` → **Create**.
2. Open the device → **Device Info**. You will see **Template ID**, **Template Name** and **Auth Token**.

## 3. Put the values in the firmware (this is the ONLY place in the firmware)
1. In `circuit/`, copy `config.example.h` to a new file named `config.h`.
2. Replace the three placeholders:
   ```c
   #define BLYNK_TEMPLATE_ID   "TMPLxxxxxxxx"      // from Device Info
   #define BLYNK_TEMPLATE_NAME "MediBridge"        // exactly the template name
   #define BLYNK_AUTH_TOKEN    "your-token-here"   // <-- YOUR TOKEN
   ```
3. Leave `MB_WIFI_SSID "Wokwi-GUEST"`, empty password, channel 6 while you use Wokwi.

## 4. Safety rules for the token
* `config.h` is git-ignored. Never commit it, screenshot it, or paste it into chats.
* **Wokwi:** treat any saved Wokwi project as something that could be shared by link. Use a separate Blynk device just for simulation, and regenerate its token (Device Info → regenerate) if you ever share the project link.
* The token lets anyone read and command that device. That is why the frontend must never get it.

## 5. First connection
Run the simulation (see `documentation/testing_guide.md`). Serial should show `[NET] WiFi connected`, then `[NET] Blynk connected`.
In Console the device turns **Online** and V8 shows `online fw=1.0.0`.

## 6. Send a reminder from the cloud
Console → Devices → your device → add a widget later, or use a browser URL (replace TOKEN):
`https://blynk.cloud/external/api/update?token=TOKEN&v6=1` → compartment 1 starts blinking in Wokwi.
`...&v6=0` cancels. (HTTPS API format from Blynk docs; check https://docs.blynk.io if it differs for your region.)
