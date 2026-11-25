"""
EXAMPLE ONLY - reference for the future FastAPI service. NOT tested against a live Blynk account.
Needs:  pip install requests
Env:    BLYNK_AUTH_TOKEN (see .env.example). Never put this token in frontend code.
"""
import json, os, time
import requests

BASE = os.environ.get("BLYNK_BASE_URL", "https://blynk.cloud")
TOKEN = os.environ["BLYNK_AUTH_TOKEN"]
REQUIRED = {"schema", "event_id", "device_id", "compartment_id", "event_type",
            "sensor_value", "timestamp", "time_synced", "uptime_ms", "detail"}
seen_ids = set()          # in the real backend: a UNIQUE column in the database


def get_pin(pin: str):
    r = requests.get(f"{BASE}/external/api/get", params={"token": TOKEN, pin: ""}, timeout=5)
    r.raise_for_status()
    return r.text


def set_pin(pin: str, value):
    requests.get(f"{BASE}/external/api/update", params={"token": TOKEN, pin: value}, timeout=5).raise_for_status()


def parse_event(raw: str):
    """Return the event dict, or None if it is invalid or already seen."""
    try:
        ev = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(ev, dict) or not REQUIRED.issubset(ev):
        return None
    if ev["event_id"] in seen_ids:
        return None
    seen_ids.add(ev["event_id"])
    return ev


def handle(ev: dict):
    print("EVENT", ev["event_type"], ev["compartment_id"], ev["sensor_value"])
    if ev["event_type"] == "stock_empty":
        print("-> backend would send the 'Medicine Refill Required' e-mail here")


if __name__ == "__main__":
    while True:
        try:
            ev = parse_event(get_pin("v10"))
            if ev:
                handle(ev)
        except requests.RequestException as exc:
            print("Blynk request failed:", exc)
        time.sleep(1)
