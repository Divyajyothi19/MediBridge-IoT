# MediBridge IoT — Smart Medication Monitoring System

> **REMIND · GUIDE · DETECT · INFORM**  
> A virtual ESP32-based smart medication dispenser with real-time monitoring, caregiver alerts, and an accessible web dashboard.

---

## 🩺 What Is MediBridge?

MediBridge is an **academic IoT project** that simulates a smart 3-compartment medication box using an ESP32 microcontroller (run entirely in the [Wokwi browser simulator](https://wokwi.com) — no physical hardware needed). It tracks whether a patient opens the right medicine compartment at the right time, monitors stock levels, and notifies caregivers via email when something goes wrong.

---

## ⚡ Quick Start (3 Steps)

### Step 1 — Run the circuit simulation
1. Go to [wokwi.com](https://wokwi.com) → create a free account  
2. New Project → ESP32 → paste in `circuit/diagram.json` and `circuit/sketch.ino`  
3. Click ▶ Run — press the green/yellow/blue buttons to open compartments

### Step 2 — Start the backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # edit with your Blynk token (optional)
python -m uvicorn main:app --reload --port 8000
```
Open: http://localhost:8000/docs

### Step 3 — Start the frontend
```bash
cd frontend
npm install
npm run dev
```
Open: http://localhost:5173

> **No credentials needed for demo mode** — the backend and frontend both work offline with simulated data.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Wokwi Browser Sim                   │
│  ESP32 DevKit V1                                        │
│  3× Buttons (lid sensors)  GPIO 25, 26, 27             │
│  3× LEDs                   GPIO 18, 19, 21             │
│  3× Potentiometers (stock) GPIO 34, 35, 32 (ADC1)      │
│  Buzzer                    GPIO 23                      │
└─────────────────────┬───────────────────────────────────┘
                      │ WiFi → Blynk Cloud (V10 events)
                      ▼
              ┌───────────────┐
              │  Blynk Cloud  │  (optional — offline mode works without it)
              └──────┬────────┘
                     │ HTTP polling (every 1 s)
                     ▼
              ┌───────────────┐
              │  FastAPI      │  backend/ (Python)
              │  Backend      │  SQLite · WebSocket · Email
              └──────┬────────┘
                     │ WebSocket ws://localhost:8000/ws
                     ▼
              ┌───────────────┐
              │  React        │  frontend/ (Vite + TypeScript)
              │  Dashboard    │  Accessibility · Voice · i18n
              └───────────────┘
```

---

## 📦 Component List

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Firmware | C++ (Arduino / ESP32) | Sensor reading, event emission |
| Simulation | Wokwi browser | Virtual hardware — no physical device needed |
| Cloud bridge | Blynk IoT (free tier) | Virtual pins V0–V11 |
| Backend | Python 3.11 + FastAPI | REST API, DB, alerts, email |
| Database | SQLite (SQLAlchemy) | Events, alerts, notifications |
| Frontend | React + Vite + TypeScript | Dashboard, charts, accessibility |
| Email | Gmail SMTP + App Password | Caregiver notifications |

---

## 📁 Project Structure

```
MediBridge-IoT/
├── circuit/              # ESP32 firmware + Wokwi simulation files
│   ├── diagram.json      # Wokwi circuit schematic
│   ├── sketch.ino        # Main firmware
│   ├── medibridge_config.h   # Pin map & thresholds
│   ├── medibridge_logic.h    # Testable logic library
│   ├── wokwi.toml        # Wokwi browser config
│   ├── libraries.txt     # Blynk library
│   ├── config.example.h  # Secrets template
│   └── config_offline.h  # Offline/demo mode config
├── backend/              # Python FastAPI backend
├── frontend/             # React dashboard
├── documentation/        # All documentation
└── README.md             # This file
```

---

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| [CIRCUIT_GUIDE.md](documentation/CIRCUIT_GUIDE.md) | Pin map, component list, LED patterns |
| [WOKWI_SETUP.md](documentation/WOKWI_SETUP.md) | Step-by-step Wokwi browser simulation guide |
| [BLYNK_SETUP.md](documentation/BLYNK_SETUP.md) | Full Blynk template + datastream setup |
| [BACKEND_SETUP.md](documentation/BACKEND_SETUP.md) | Backend install + run guide |
| [FRONTEND_SETUP.md](documentation/FRONTEND_SETUP.md) | Frontend install + run guide |
| [GMAIL_SETUP.md](documentation/GMAIL_SETUP.md) | Gmail App Password for email alerts |
| [SYSTEM_ARCHITECTURE.md](documentation/SYSTEM_ARCHITECTURE.md) | Full architecture + data flow |
| [ACCESSIBILITY_GUIDE.md](documentation/ACCESSIBILITY_GUIDE.md) | Voice guidance, fonts, contrast |
| [TESTING_REPORT.md](documentation/TESTING_REPORT.md) | Honest test results |
| [FUTURE_SCOPE.md](documentation/FUTURE_SCOPE.md) | Planned features |
| [MY_MANUAL_TASKS.md](documentation/MY_MANUAL_TASKS.md) | **What YOU must do manually** |

---

## ⚠️ Academic Disclaimer

This project is built for **academic / educational purposes**. It simulates medication adherence monitoring using virtual hardware. It is **not a medical device** and must not be used for real clinical decisions or patient care.

The stock level sensors are simulated with potentiometers — not real weight sensors. The system records that a lid was **opened**, not that medicine was **taken**.
