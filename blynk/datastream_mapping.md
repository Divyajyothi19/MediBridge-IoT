# Blynk datastream mapping

Direction is from the **device's** point of view. Create these in Blynk Console → your template → **Datastreams** → *New Datastream → Virtual Pin*.

## Core datastreams (5) – required
| Pin | Name | Type | Min / Max | Default | Direction | Meaning |
|---|---|---|---|---|---|---|
| V6 | Reminder Command | Integer | 0 / 3 | 0 | backend → device | 0 = cancel, 1–3 = remind that compartment. Device writes 0 back when the reminder ends. |
| V7 | Buzzer Command | Integer | 0 / 1 | 0 | backend → device | 0 = mute reminder sound, 1 = 1.5 s test beep |
| V8 | Device Status | String | – | – | device → backend | `online fw=1.0.0`, written when the device connects |
| V10 | Event JSON | String | – | – | device → backend | **Authoritative event stream** (see `firmware/event_format.md`) |
| V11 | Heartbeat | Integer | 0 / 2000000 | 0 | device → backend | Uptime in seconds, every 5 min |

## Extended datastreams (7) – optional convenience (`MB_EXTENDED_PINS 1`)
| Pin | Name | Type | Min / Max | Meaning |
|---|---|---|---|---|
| V0, V1, V2 | Compartment 1/2/3 Interaction | Integer | 0 / 1 | 1 = lid open, 0 = closed |
| V3, V4, V5 | Compartment 1/2/3 Stock % | Integer | 0 / 100 | Simulated stock level |
| V9 | Unexpected Interaction | Integer | 0 / 3 | Compartment id that was opened wrongly (details are in V10) |

## Changes from your suggested plan (all documented)
* V6 is now a single integer (0–3) instead of an on/off, so one pin selects the compartment.
* V7 is a command (mute / test), not a raw buzzer level.
* V9 holds only the compartment id; the full information is in the V10 event.
* **Added V10** (event JSON) and **V11** (heartbeat). Reason: a plain value like "1" on V0 loses the event id, timestamp and type. V10 carries them.
* **Added the 5-datastream "core" mode** because Blynk free-plan limits differ between accounts.

## Plan limits you must check on YOUR account
Blynk's pricing page lists 20 datastreams per template and 30,000 messages/month for Free, but community posts show older free accounts with 10 or even 5.
* If Console refuses the 12th datastream: create only the 5 core ones and set `#define MB_EXTENDED_PINS 0` in `circuit/medibridge_config.h`. Nothing else changes.
* Message budget: every `virtualWrite` is a message. The firmware sends one message per event, stock % only on status change or ≥10 % change, heartbeat every 5 min. Leaving the simulator running all day costs about 300 heartbeat messages/day.
