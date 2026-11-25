"""
MediBridge Backend — main.py
FastAPI application entry point with lifespan, routers, CORS, and WebSocket.
"""
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("medibridge")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    from database import init_db
    from services.blynk_poller import start_poller, stop_poller
    from seed import seed_demo_data

    logger.info("MediBridge backend starting up…")
    await init_db()
    await seed_demo_data()
    await start_poller()
    yield
    logger.info("MediBridge backend shutting down…")
    await stop_poller()


app = FastAPI(
    title="MediBridge API",
    description="Smart medication monitoring system — IoT backend.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
_origins_raw = os.getenv(
    "CORS_ORIGINS", 
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
)
origins = [o.strip() for o in _origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers import (  # noqa: E402
    patients, caregivers, medicines, schedules, devices,
    events, alerts, notifications, compartments, reports,
)
from routers.websocket import router as ws_router  # noqa: E402

app.include_router(patients.router, prefix="/api", tags=["patients"])
app.include_router(caregivers.router, prefix="/api", tags=["caregivers"])
app.include_router(medicines.router, prefix="/api", tags=["medicines"])
app.include_router(schedules.router, prefix="/api", tags=["schedules"])
app.include_router(devices.router, prefix="/api", tags=["devices"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(alerts.router, prefix="/api", tags=["alerts"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])
app.include_router(compartments.router, prefix="/api", tags=["compartments"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(ws_router, tags=["websocket"])


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "service": "MediBridge API", "version": "1.0.0"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
