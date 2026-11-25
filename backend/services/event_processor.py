"""
MediBridge Backend — services/event_processor.py
Processes incoming firmware events:
  1. Persist to events table (idempotent — reject duplicate event_ids)
  2. Update compartment state
  3. Broadcast via WebSocket
  4. Apply alert rules
"""
import json
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("medibridge.events")

# Compartment state label mapping (from API_CONTRACT.md)
_STATE_LABELS = {
    "reminder_started":    "Reminder Active",
    "compartment_opened":  "Interaction Recorded",
    "compartment_closed":  "OK",
    "wrong_compartment":   "Wrong Compartment",
    "stock_empty":         "Medicine Refill Required",
    "reminder_missed":     "Reminder Missed",
    "reminder_stopped":    "OK",
    "stock_changed":       None,   # keep current label; update stock fields
    "device_started":      None,   # device-level only
}


async def ingest_event(event_data: dict, db: AsyncSession) -> dict:
    """
    Validate, persist, and process one firmware event.
    Returns the saved event as a dict, or raises ValueError on duplicate.
    """
    from models import Event, Compartment, Device
    from services.alert_service import process_alert
    from services.websocket_manager import ws_manager

    event_id = event_data.get("event_id")
    if not event_id:
        raise ValueError("event_id is required")

    # Idempotency check
    existing = await db.execute(select(Event).where(Event.event_id == event_id))
    if existing.scalar_one_or_none():
        raise ValueError(f"Duplicate event_id: {event_id}")

    received_at = datetime.utcnow()

    event = Event(
        event_id=event_id,
        device_id=event_data.get("device_id", ""),
        compartment_id=event_data.get("compartment_id", 0),
        event_type=event_data.get("event_type", ""),
        sensor_value=event_data.get("sensor_value"),
        device_timestamp=event_data.get("timestamp"),
        time_synced=event_data.get("time_synced"),
        uptime_ms=event_data.get("uptime_ms"),
        detail=event_data.get("detail"),
        received_at=received_at,
        raw_json=json.dumps(event_data),
    )
    db.add(event)
    await db.flush()

    # Update compartment state
    updated_compartment = await _update_compartment(event, db)

    await db.commit()
    await db.refresh(event)

    # Broadcast WebSocket
    event_dict = {
        "event_id": event.event_id,
        "device_id": event.device_id,
        "compartment_id": event.compartment_id,
        "event_type": event.event_type,
        "sensor_value": event.sensor_value,
        "detail": event.detail,
        "received_at": str(event.received_at),
    }
    ws_payload: dict = {
        "type": "event",
        "data": event_dict,
        "event": event_dict,
    }
    await ws_manager.broadcast(ws_payload)

    if updated_compartment:
        comp_dict = _compartment_dict(updated_compartment)
        await ws_manager.broadcast({
            "type": "compartment_state",
            "data": comp_dict,
            "compartment": comp_dict,
        })

    # Alert rules
    await process_alert(event, db)

    return ws_payload["event"]


async def _update_compartment(event, db: AsyncSession):
    """Update the compartment row based on the event type."""
    from models import Compartment, Device

    if event.event_type == "device_started":
        # Mark device as online
        dev = await db.execute(
            select(Device).where(Device.device_id == event.device_id)
        )
        device = dev.scalar_one_or_none()
        if device:
            device.is_online = True
            device.last_heartbeat_at = datetime.utcnow()
            if event.detail and event.detail.startswith("fw="):
                device.firmware_version = event.detail[3:]
        return None

    # Find compartment by (device string id, compartment number)
    dev_res = await db.execute(
        select(Device).where(Device.device_id == event.device_id)
    )
    device = dev_res.scalar_one_or_none()
    if not device:
        logger.warning("Device not found: %s", event.device_id)
        return None

    comp_res = await db.execute(
        select(Compartment).where(
            Compartment.device_id == device.id,
            Compartment.compartment_number == event.compartment_id,
        )
    )
    comp = comp_res.scalar_one_or_none()
    if not comp:
        logger.warning(
            "Compartment %d not found for device %s", event.compartment_id, event.device_id
        )
        return None

    new_label = _STATE_LABELS.get(event.event_type)
    comp.updated_at = datetime.utcnow()

    if event.event_type == "compartment_opened":
        comp.lid_open = True
        comp.last_interaction_at = datetime.utcnow()
        comp.state_label = "Interaction Recorded"

    elif event.event_type == "compartment_closed":
        comp.lid_open = False
        comp.state_label = "OK"

    elif event.event_type == "reminder_started":
        comp.reminder_active = True
        comp.state_label = "Reminder Active"

    elif event.event_type == "reminder_stopped":
        comp.reminder_active = False
        comp.state_label = "OK"

    elif event.event_type == "reminder_missed":
        comp.reminder_active = False
        comp.state_label = "Reminder Missed"

    elif event.event_type == "wrong_compartment":
        comp.state_label = "Wrong Compartment"

    elif event.event_type in ("stock_changed", "stock_empty"):
        if event.sensor_value is not None:
            comp.stock_percent = float(event.sensor_value)
        if event.event_type == "stock_empty":
            comp.stock_status = "EMPTY"
            comp.state_label = "Medicine Refill Required"
        else:
            # Derive stock_status from percent
            pct = comp.stock_percent
            comp.stock_status = (
                "FULL" if pct >= 70 else
                "MEDIUM" if pct >= 30 else
                "LOW" if pct > 0 else
                "EMPTY"
            )

    return comp


def _compartment_dict(comp) -> dict:
    return {
        "id": comp.id,
        "device_id": comp.device_id,
        "compartment_number": comp.compartment_number,
        "medicine_name": comp.medicine_name,
        "dosage": comp.dosage,
        "schedule_time": comp.schedule_time,
        "lid_open": comp.lid_open,
        "stock_percent": comp.stock_percent,
        "stock_status": comp.stock_status,
        "reminder_active": comp.reminder_active,
        "state_label": comp.state_label,
        "updated_at": str(comp.updated_at),
    }
