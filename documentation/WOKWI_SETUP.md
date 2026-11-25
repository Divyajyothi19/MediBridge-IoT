# Wokwi Setup Guide — MediBridge IoT

> [!IMPORTANT]
> This guide is for **wokwi.com** (browser simulation). No VS Code extension, no PlatformIO, no physical hardware required.

---

## Prerequisites
- A modern web browser (Chrome or Firefox recommended)
- A free Wokwi account (email signup, no credit card)
- The project files from `circuit/` folder

---

## Step-by-Step Setup

### Step 1 — Create a Wokwi Account
1. Open [https://wokwi.com](https://wokwi.com) in your browser
2. Click **Sign Up** (top right)
3. Sign up with Google or email
4. Verify your email if prompted

### Step 2 — Create a New ESP32 Project
1. Click **+ New Project** (or the blue button on the dashboard)
2. Select **ESP32** from the board list
3. A new project opens with a blank ESP32 and an empty `sketch.ino`

### Step 3 — Upload the Circuit (diagram.json)
1. In Wokwi, look at the left panel — you'll see a tab for the diagram
2. Click the **diagram.json** tab
3. Select all existing content (`Ctrl+A`) and delete it
4. Open `circuit/diagram.json` from your project folder
5. Copy the entire contents and paste into Wokwi's diagram.json tab
6. The circuit should appear — you'll see the ESP32, 3 buttons, 3 LEDs, 3 potentiometers, and a buzzer

### Step 4 — Upload the Main Firmware (sketch.ino)
1. Click the **sketch.ino** tab in Wokwi
2. Select all and delete
3. Open `circuit/sketch.ino` from your project folder
4. Copy and paste the entire contents into Wokwi's sketch.ino tab

### Step 5 — Upload Additional Header Files
Wokwi allows multiple files in a project. For each header file:

1. Click the **+** button (Add File) at the top of the file panel
2. Type the filename exactly as shown below
3. Paste the contents

Files to add:
- `medibridge_config.h` → copy from `circuit/medibridge_config.h`
- `medibridge_logic.h` → copy from `circuit/medibridge_logic.h`

### Step 6 — Choose Your Mode

#### Option A: Offline / Demo Mode (No Blynk account needed — recommended for testing)
1. Click **+** (Add File) → name it `config.h`
2. Open `circuit/config_offline.h` from your project folder
3. Copy and paste its contents into the new `config.h` in Wokwi
4. The firmware will run in **OFFLINE mode** (Serial only, no WiFi/Blynk)

#### Option B: Blynk Cloud Mode (Requires Blynk setup first)
1. Complete [BLYNK_SETUP.md](BLYNK_SETUP.md) first to get your credentials
2. Click **+** (Add File) → name it `config.h`
3. Open `circuit/config.example.h` from your project folder
4. Paste contents, then fill in:
   ```cpp
   #define BLYNK_TEMPLATE_ID   "TMPLxxxxxx"   // from Blynk template
   #define BLYNK_TEMPLATE_NAME "MediBridge"
   #define BLYNK_AUTH_TOKEN    "your_actual_token_here"
   #define MB_DEVICE_ID        "MB-ESP32-01"
   #define MB_WIFI_SSID        "Wokwi-GUEST"
   #define MB_WIFI_PASS        ""
   #define MB_WIFI_CHANNEL     6
   ```

### Step 7 — Add the Blynk Library (for Blynk mode only)
1. In Wokwi, look for the **libraries.txt** file or add it via **+**
2. If `libraries.txt` doesn't exist, create it with content:
   ```
   Blynk
   ```
3. Wokwi automatically downloads the Blynk library on first compile
4. _(Skip this step if using offline mode — library won't be used)_

### Step 8 — Run the Simulation
1. Click the **green triangle ▶ (Run)** button
2. Wait for compilation (10–30 seconds on first run)
3. The Serial Monitor appears at the bottom
4. You should see:
   ```
   MediBridge firmware 1.0.0  (type h for commands)
   [NET] no config.h -> OFFLINE mode (Serial only)
   ---- MediBridge status ----
   C1 Medicine A  dose=1 tablet   at=08:00 lid=closed stock=75% (FULL) ...
   ```

### Step 9 — Open the Serial Monitor
- The Serial Monitor is shown at the bottom of the Wokwi screen
- Baud rate: **115200** (set automatically)
- You can type commands directly in the Serial Monitor input box

---

## Testing Guide

### Test 1: Compartment Buttons
1. Click the **green button (Lid 1)** — LED1 should light up solid for 3 seconds
2. Serial Monitor shows: `[EVENT] {"event_type":"compartment_opened",...}`
3. Click the **yellow button (Lid 2)** — LED2 lights up
4. Click the **blue button (Lid 3)** — LED3 lights up

### Test 2: Stock Levels
1. Find the potentiometers (labeled Pot 1, Pot 2, Pot 3)
2. Click and drag a potentiometer handle **counterclockwise** (turn left)
3. Watch the Serial Monitor — after ~2 seconds you should see a `stock_changed` event
4. Turn it all the way left → `stock_empty` event fires, LED blinks in short blips

### Test 3: Reminder System (Serial Monitor commands)
1. Type `r1` in the Serial Monitor → Enter
2. LED1 starts **slow blinking** (reminder active)
3. Buzzer plays reminder pattern
4. Press the **green button (Lid 1)** → reminder is acknowledged, LED goes solid briefly
5. Serial Monitor shows: `[EVENT] {"event_type":"compartment_opened","detail":"expected",...}`

### Test 4: Wrong Compartment
1. Type `r1` → Enter (start reminder for compartment 1)
2. Press the **yellow button (Lid 2)** instead
3. LED2 starts **fast flickering**, buzzer plays warning
4. Serial Monitor shows: `[EVENT] {"event_type":"wrong_compartment","detail":"expected=1",...}`

### Test 5: Reminder Missed
1. Type `r2` → Enter
2. Wait 5 minutes without pressing button 2
3. Serial Monitor shows: `[EVENT] {"event_type":"reminder_missed","detail":"timeout",...}`

### Test 6: Status Check
1. Type `s` → Enter
2. Full status table is printed for all 3 compartments

---

## Common Issues

| Problem | Solution |
|---------|---------|
| Compilation error about `config.h` | Add `config.h` file (Step 6) |
| "Blynk not compiled" in Serial | Normal — means no BLYNK_AUTH_TOKEN defined (offline mode is working) |
| Library download taking long | Wait up to 60 seconds; Wokwi fetches Blynk from Arduino registry |
| Buttons not responding | Make sure diagram.json was pasted correctly and simulation is running |
| LEDs stay off | Check the diagram — LEDs need resistors in series (already in diagram.json) |
| Serial Monitor empty | Click ▶ Run button; look for red error text at top of simulator |

---

## Notes

- Wokwi simulates real ESP32 WiFi — in Blynk mode, it connects to Blynk's servers through the simulated `Wokwi-GUEST` network
- The simulation is deterministic: the same actions always produce the same events
- Event timestamps will show `null` in offline mode (no NTP without WiFi)
- In Blynk mode with valid credentials, real timestamps from NTP are included
