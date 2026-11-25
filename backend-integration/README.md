# backend-integration

Everything the future backend developer (you, in Antigravity) needs from the device side.

| File | Use |
|---|---|
| `API_CONTRACT.md` | Proposed REST/WebSocket/DB/e-mail design |
| `event_examples.json` | Real events produced by the firmware tests, one per type |
| `.env.example` | Backend secrets template (copy to `.env`) |
| `blynk_poller_example.py` | Small example reader (untested against a live account) |

Credentials: the Blynk token is in the firmware (`circuit/config.h`) and the backend (`.env`). The frontend gets neither.
