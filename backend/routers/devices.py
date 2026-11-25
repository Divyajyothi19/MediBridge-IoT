"""routers/devices.py — Devices + Blynk control endpoints."""
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import aiohttp

from database import get_db
from models import Device, Compartment
from schemas import DeviceCreate, DeviceOut, DeviceStatus, CompartmentOut, ReminderRequest, BuzzerRequest

router = APIRouter()


@router.get("/devices", response_model=List[DeviceOut])
async def list_devices(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device))
    return result.scalars().all()


@router.post("/devices", response_model=DeviceOut, status_code=201)
async def create_device(payload: DeviceCreate, db: AsyncSession = Depends(get_db)):
    # Check unique device_id
    existing = await db.execute(select(Device).where(Device.device_id == payload.device_id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Device with this device_id already exists")
    device = Device(**payload.model_dump())
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@router.get("/devices/{device_id}/status", response_model=DeviceStatus)
async def get_device_status(device_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.device_id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(404, "Device not found")
    return DeviceStatus(
        device_id=device.device_id,
        is_online=device.is_online,
        last_heartbeat_at=device.last_heartbeat_at,
        firmware_version=device.firmware_version,
    )


@router.get("/devices/{device_id}/compartments", response_model=List[CompartmentOut])
async def get_device_compartments(device_id: str, db: AsyncSession = Depends(get_db)):
    dev_res = await db.execute(select(Device).where(Device.device_id == device_id))
    device = dev_res.scalar_one_or_none()
    if not device:
        raise HTTPException(404, "Device not found")
    result = await db.execute(
        select(Compartment).where(Compartment.device_id == device.id)
    )
    return result.scalars().all()


@router.post("/devices/{device_id}/reminders", status_code=200)
async def set_reminder(device_id: str, payload: ReminderRequest, db: AsyncSession = Depends(get_db)):
    """Write Blynk V6 = compartment_id to start a reminder."""
    result = await _blynk_write(pin="v6", value=payload.compartment_id)
    return {"status": "ok", "blynk": result, "compartment_id": payload.compartment_id}


@router.delete("/devices/{device_id}/reminders", status_code=200)
async def cancel_reminder(device_id: str, db: AsyncSession = Depends(get_db)):
    """Write Blynk V6 = 0 to cancel reminder."""
    result = await _blynk_write(pin="v6", value=0)
    return {"status": "ok", "blynk": result}


@router.post("/devices/{device_id}/buzzer", status_code=200)
async def control_buzzer(device_id: str, payload: BuzzerRequest, db: AsyncSession = Depends(get_db)):
    """Write Blynk V7: 0=mute, 1=test."""
    if payload.action not in ("mute", "test"):
        raise HTTPException(400, "action must be 'mute' or 'test'")
    value = 0 if payload.action == "mute" else 1
    result = await _blynk_write(pin="v7", value=value)
    return {"status": "ok", "action": payload.action, "blynk": result}


async def _blynk_write(pin: str, value: int) -> dict:
    """Write a value to a Blynk virtual pin via HTTP API."""
    token = os.getenv("BLYNK_AUTH_TOKEN", "PASTE_YOUR_TOKEN_HERE")
    base_url = os.getenv("BLYNK_BASE_URL", "https://blynk.cloud")

    if token in ("PASTE_YOUR_TOKEN_HERE", "", None):
        return {"mode": "demo", "message": "Blynk token not configured"}

    url = f"{base_url}/external/api/update"
    params = {"token": token, pin: value}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                return {"status_code": resp.status, "ok": resp.status == 200}
    except Exception as exc:
        return {"error": str(exc)}
