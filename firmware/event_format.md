# Event format (schema 1)

Every important thing the box does becomes one compact JSON line (always < 256 bytes, Blynk's default message limit).
It is printed on Serial as `[EVENT] {...}` and sent to Blynk datastream **V10** when the cloud is available.

```json
{"schema":1,"event_id":"MB-ESP32-01-a1b2c3d4-0007","device_id":"MB-ESP32-01","compartment_id":2,
 "event_type":"stock_empty","sensor_value":0,"timestamp":"2026-11-24T10:15:30Z","time_synced":true,
 "uptime_ms":123456,"detail":"LOW->EMPTY"}
```

| Field | Meaning |
|---|---|
| `schema` | Format version (1). |
| `event_id` | `<device_id>-<boot id>-<sequence>`. Unique. The boot id changes every restart, so IDs never repeat. Gaps in the sequence mean a lost event. |
| `device_id` | From `MB_DEVICE_ID`. |
| `compartment_id` | 1–3, or 0 for the whole device. |
| `event_type` | See table below. |
| `sensor_value` | Event-specific number (see table). |
| `timestamp` | UTC from NTP, or `null` until the clock is synced. If `null`, the backend must use its own receive time. |
| `time_synced` | `true` if `timestamp` came from NTP. |
| `uptime_ms` | Milliseconds since boot; use it to order events from one boot even without a clock. |
| `detail` | Short text, see table. |

| `event_type` | When | `sensor_value` | `detail` |
|---|---|---|---|
| `device_started` | Boot | 0 | `fw=<version>` |
| `reminder_started` | Reminder command accepted | compartment id | `blynk` or `serial` |
| `reminder_stopped` | Reminder cancelled by command | 0 | `cancelled_cloud` / `cancelled_serial` |
| `reminder_missed` | No correct lid opened within `MB_REMINDER_TIMEOUT_MS` | 0 | `timeout` |
| `compartment_opened` | Lid opened (right one, or no reminder active) | 1 | `expected` / `no_active_reminder` |
| `compartment_closed` | Lid closed | 0 | empty |
| `wrong_compartment` | A different lid opened during a reminder. `compartment_id` = the lid that was opened | 1 | `expected=<id>` |
| `stock_changed` | Stock status confirmed changed | percent 0–100 | `FULL->MEDIUM` etc. |
| `stock_empty` | Stock reached EMPTY (→ caregiver email) | percent | `LOW->EMPTY` or `EMPTY at boot` |

Rules
* `compartment_opened` means **the lid was opened**. It never means the medicine was taken.
* `stock_empty` is sent once per transition into EMPTY (and once at boot if it starts empty).
* Events are queued (16) while offline and sent oldest-first, at least 1.5 s apart. If the queue overflows the oldest is dropped.
