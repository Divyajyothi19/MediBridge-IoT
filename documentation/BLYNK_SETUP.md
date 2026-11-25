# Blynk Setup Guide — MediBridge IoT

> [!NOTE]
> Blynk is **optional**. The simulation works fully in offline mode (see [WOKWI_SETUP.md](WOKWI_SETUP.md)). Set up Blynk only if you want real-time cloud connectivity and backend integration.

---

## Step 1 — Create a Blynk Account

1. Go to [https://blynk.cloud](https://blynk.cloud)
2. Click **Sign Up**
3. Enter your email and create a password
4. Verify your email address
5. Log in to the Blynk Console

---

## Step 2 — Create a Template

1. In the Blynk Console, click **Developer Zone** in the left sidebar (or the **Templates** menu)
2. Click **+ New Template**
3. Fill in:
   - **Name**: `MediBridge`
   - **Hardware**: `ESP32`
   - **Connection Type**: `WiFi`
4. Click **Done**
5. You'll see your **Template ID** and **Template Name** at the top — copy them

---

## Step 3 — Create All 12 Datastreams

In your MediBridge template, click the **Datastreams** tab, then **+ New Datastream** → **Virtual Pin** for each row:

| Virtual Pin | Name | Data Type | Min | Max | Description |
|-------------|------|-----------|-----|-----|-------------|
| V0 | Lid Interaction 1 | Integer | 0 | 1 | Compartment 1 opened (1) / closed (0) |
| V1 | Lid Interaction 2 | Integer | 0 | 1 | Compartment 2 opened (1) / closed (0) |
| V2 | Lid Interaction 3 | Integer | 0 | 1 | Compartment 3 opened (1) / closed (0) |
| V3 | Stock Percent 1 | Integer | 0 | 100 | Compartment 1 stock level % |
| V4 | Stock Percent 2 | Integer | 0 | 100 | Compartment 2 stock level % |
| V5 | Stock Percent 3 | Integer | 0 | 100 | Compartment 3 stock level % |
| V6 | Reminder Command | Integer | 0 | 3 | 0=cancel, 1/2/3=start reminder |
| V7 | Buzzer Command | Integer | 0 | 1 | 0=mute, 1=test beep |
| V8 | Device Status | String | — | — | "online fw=1.0.0" |
| V9 | Wrong Compartment | Integer | 0 | 3 | ID of wrong compartment pressed |
| V10 | Event JSON | String | — | — | Full event payload (backend polls this) |
| V11 | Heartbeat | Integer | 0 | 999999 | Uptime seconds |

> [!IMPORTANT]
> Create **all 12** datastreams. Missing datastreams will cause the firmware to silently skip writing to those pins.

For each datastream:
1. Click **+ New Datastream** → **Virtual Pin**
2. Set the Virtual Pin number (V0, V1, ... V11)
3. Set the Name from the table above
4. Set Data Type (Integer or String as shown)
5. Set Min/Max for Integer types
6. Click **Create**

---

## Step 4 — Create a Device

1. Click **Devices** in the left sidebar
2. Click **+ New Device**
3. Select **From Template** → choose **MediBridge**
4. Set **Device Name**: `medibridge-sim`
5. Click **Create**

---

## Step 5 — Get Your Credentials

After creating the device:
1. The device page shows your **Auth Token** — click the copy icon
2. Go back to the template to get **Template ID** and **Template Name**

You need three values:
```
BLYNK_TEMPLATE_ID   = "TMPLxxxxxxxxxxxxxx"   (looks like TMPL...)
BLYNK_TEMPLATE_NAME = "MediBridge"
BLYNK_AUTH_TOKEN    = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  (32+ chars)
```

---

## Step 6 — Paste Credentials into config.h

In your Wokwi project, open (or create) `config.h` and paste:

```cpp
#define BLYNK_TEMPLATE_ID   "TMPLxxxxxxxxxxxxxx"
#define BLYNK_TEMPLATE_NAME "MediBridge"
#define BLYNK_AUTH_TOKEN    "your_32char_auth_token_here"
#define MB_DEVICE_ID        "MB-ESP32-01"
#define MB_WIFI_SSID        "Wokwi-GUEST"
#define MB_WIFI_PASS        ""
#define MB_WIFI_CHANNEL     6
```

> [!CAUTION]
> Never commit `config.h` with real credentials to a public git repository. The file is already in `.gitignore`.

---

## Step 7 — Verify Connection

1. Run the Wokwi simulation with your config.h
2. Watch the Serial Monitor for:
   ```
   [NET] cloud mode: connecting WiFi, then Blynk (non-blocking)
   [NET] WiFi connected, IP 192.168.x.x
   [NET] Blynk connected
   ```
3. In Blynk Console → Devices → `medibridge-sim`, the device shows as **Online**
4. V8 (Device Status) shows `online fw=1.0.0`

---

## Step 8 — Send a Reminder from Blynk Console

1. In Blynk Console, open your `medibridge-sim` device
2. Click **Datastreams** tab
3. Find **V6 (Reminder Command)**
4. Click the edit icon → set value to `1` → click **Update**
5. The ESP32 starts a reminder for compartment 1
6. Serial Monitor shows: `[EVENT] {"event_type":"reminder_started",...}`
7. Set V6 back to `0` to cancel

---

## Step 9 — Copy Token to Backend .env

Also paste the Auth Token into `backend/.env`:
```ini
BLYNK_AUTH_TOKEN=your_32char_auth_token_here
```
The backend's Blynk poller uses this to poll V10 every second for new events.

---

## Free Plan Limits

| Limit | Value |
|-------|-------|
| Devices | 2 |
| Datastreams | 15 |
| Messages/month | ~100,000 |
| Dashboard widgets | 10 |

**If you hit the message limit:**
- Increase `MB_HEARTBEAT_MS` in `medibridge_config.h` (default is 300,000 ms = 5 min — already minimal)
- Reduce `MB_STOCK_REPORT_DELTA` to avoid frequent stock updates
- Disable extended pins: set `MB_EXTENDED_PINS 0` to use only 5 datastreams (V6–V11)

**If you hit the device limit:**
- Delete test devices from the Blynk Console
- One real device + one Wokwi sim = 2 devices (the free limit)
