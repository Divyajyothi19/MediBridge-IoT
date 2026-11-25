"""Checks every event JSON the firmware sent (events_dump.jsonl) against the contract."""
import json, sys
REQ = {"schema": int, "event_id": str, "device_id": str, "compartment_id": int, "event_type": str,
       "sensor_value": int, "timestamp": (str, type(None)), "time_synced": bool, "uptime_ms": int, "detail": str}
TYPES = {"device_started", "reminder_started", "reminder_stopped", "reminder_missed", "compartment_opened",
         "compartment_closed", "wrong_compartment", "stock_changed", "stock_empty"}
seen, bad = set(), 0
lines = [l for l in open("events_dump.jsonl").read().splitlines() if l.strip()]
for l in lines:
    if len(l.encode()) >= 256: print("too long:", l); bad += 1
    try: e = json.loads(l)
    except Exception as ex: print("invalid JSON:", l, ex); bad += 1; continue
    for k, t in REQ.items():
        if k not in e or not isinstance(e[k], t): print("bad/missing", k, "in", l); bad += 1
    if e.get("event_type") not in TYPES: print("unknown type", e.get("event_type")); bad += 1
    if e.get("event_id") in seen: print("duplicate event_id", e["event_id"]); bad += 1
    seen.add(e.get("event_id"))
print(f"{len(lines)} events validated, {bad} problems")
sys.exit(1 if bad else 0)
