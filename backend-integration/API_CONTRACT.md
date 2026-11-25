# Backend API contract (PROPOSED — nothing here is implemented yet)

For the Antigravity stage: FastAPI + SQLite/PostgreSQL + WebSocket + Gmail SMTP. The device side of the contract is fixed (`firmware/event_format.md`, `event_examples.json`).

## 1. Ingest (internal, from the Blynk poller)
`ingest(event)` validates the firmware event, then
1. inserts into `events` (reject if `event_id` exists → idempotent),
2. updates `compartments` state,
3. broadcasts on the WebSocket,
4. applies notification rules.
`received_at` (server time) is added; use it when `timestamp` is `null`.

## 2. REST for the React app (all authenticated by the app's own login, never by the Blynk token)
| Method / path | Purpose |
|---|---|
| `GET /api/devices/{device_id}/compartments` | Current state of the 3 compartments |
| `GET /api/events?device_id=&compartment_id=&type=&limit=` | Event history |
| `POST /api/devices/{device_id}/reminders` `{ "compartment_id": 2 }` | Start reminder (backend writes Blynk V6=2) |
| `DELETE /api/devices/{device_id}/reminders` | Cancel (V6=0) |
| `POST /api/devices/{device_id}/buzzer` `{ "action": "mute" \| "test" }` | V7 = 0 / 1 |
| `GET/PUT /api/compartments/{id}` | Medicine name, dosage, schedule, patient, caregiver e-mail |
| `GET /api/devices/{device_id}/status` | online/offline, last heartbeat |

## 3. WebSocket `/ws`
Server → client messages: `{"type":"event","event":{...firmware event...}}` and `{"type":"compartment_state","compartment":{...}}`.

## 4. Compartment state shown to users
| Condition | Label |
|---|---|
| active reminder | Reminder Active |
| `compartment_opened` after reminder | Interaction Recorded |
| `wrong_compartment` | Wrong Compartment |
| stock EMPTY | Medicine Refill Required |
| `reminder_missed` | Reminder Missed |
Never show "Medicine taken" — the sensor only knows the lid opened.

## 5. Notification rules
| Trigger | Action |
|---|---|
| `stock_empty` | Caregiver e-mail via Gmail SMTP (template below) |
| `wrong_compartment` | Caregiver alert (e-mail/push – to design) |
| `reminder_missed` | Caregiver alert + future vibration band |
| `device_started` | Log only |

E-mail for `stock_empty` (sent by the backend only — never by the ESP32 or the browser):
```
Subject: MediBridge — Medicine Refill Required

A medicine stock alert has been detected.

Patient: {patient_name}
Medicine: {medicine_name}
Compartment: {compartment_id}
Stock Status: Empty
Detected At: {timestamp or received_at}

Please arrange a medicine refill.
```
Use a Google **App Password** for SMTP (requires 2-step verification on the Gmail account). De-duplicate: one e-mail per `event_id`.

## 6. Suggested tables
```sql
CREATE TABLE events (
  event_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, compartment_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, sensor_value INTEGER, device_timestamp TEXT, time_synced INTEGER,
  uptime_ms INTEGER, detail TEXT, received_at TEXT NOT NULL, raw_json TEXT NOT NULL);
CREATE TABLE compartments (
  device_id TEXT, compartment_id INTEGER, medicine_name TEXT, dosage TEXT, schedule_time TEXT,
  lid_open INTEGER, stock_percent INTEGER, stock_status TEXT, reminder_active INTEGER,
  last_interaction_at TEXT, state_label TEXT, PRIMARY KEY (device_id, compartment_id));
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY, event_id TEXT UNIQUE, channel TEXT, recipient TEXT, status TEXT, error TEXT, sent_at TEXT);
```
Record the real result in `notifications.status` (`sent` / `failed`) — never mark an e-mail sent unless SMTP accepted it.
