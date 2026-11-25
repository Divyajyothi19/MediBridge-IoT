# How the backend gets events from Blynk

Rule: **only the backend talks to Blynk.** The React app talks to the backend (REST + WebSocket). The Blynk token never leaves the server.

```
ESP32 --(Blynk protocol)--> Blynk Cloud <--(HTTPS API, token)-- FastAPI backend --> DB, e-mail, WebSocket --> React
```

## Option A (use this first): backend polls the HTTPS API
Every ~1 s the backend reads V10 and processes the JSON if its `event_id` is new:
`GET https://blynk.cloud/external/api/get?token=<TOKEN>&v10`
`GET https://blynk.cloud/external/api/isHardwareConnected?token=<TOKEN>` (online/offline)
Send commands: `GET https://blynk.cloud/external/api/update?token=<TOKEN>&v6=2`
An example is in `backend-integration/blynk_poller_example.py` (**not tested against a live Blynk account**).

Steps for each polled value: parse JSON → check required fields → drop if `event_id` already stored → store → push to WebSocket → apply rules (e.g. `stock_empty` → e-mail).

### Known limitation (read this)
V10 only holds the **latest** value. If two events arrive between two polls the first is overwritten.
Mitigations built in: the device spaces events ≥1.5 s apart and the backend polls every 1 s.
It is not a guarantee. Detect losses by watching the sequence number at the end of `event_id` (a jump = a lost event).
Blynk's own historical-data API or a webhook could close this gap; **I have not verified their current behaviour or free-plan limits** (Blynk docs list 1 webhook per organisation and 10 requests/min per webhook on Free), so check https://docs.blynk.io before relying on them.

## Option B (later): Blynk Webhook
Blynk can call a URL of your backend. Needs a public HTTPS URL (e.g. a tunnel while developing) and respects the limits above. Not verified here.

## Device online/offline
The device cannot announce its own death. Use `isHardwareConnected` plus the V11 heartbeat (every 5 min). Treat the device as offline if the last heartbeat is older than ~12 min **and** `isHardwareConnected` is false.

## Commands the backend sends
| Goal | Write |
|---|---|
| Remind compartment N | V6 = N |
| Cancel reminder | V6 = 0 |
| Mute buzzer | V7 = 0 |
| Test beep | V7 = 1 |

The device ignores a repeated V6 = N while N is active, and writes V6 = 0 back after the lid is opened, so the next V6 = N is a real change.
Reminder *scheduling* (08:00 etc.) lives in the backend database, not in the firmware.
