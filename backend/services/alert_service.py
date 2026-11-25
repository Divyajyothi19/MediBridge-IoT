"""
MediBridge Backend — services/alert_service.py
Applies alert rules after event ingestion:
  - wrong_compartment  → HIGH alert + email
  - reminder_missed    → MEDIUM alert + email
  - stock_empty        → HIGH alert + email
"""
import logging
import time
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger("medibridge.alerts")

# Anti-spam cooldown: (device_id, alert_type, compartment_id) -> last_sent_timestamp
_EMAIL_COOLDOWN_SECONDS = 180  # 3 minutes cooldown between duplicate emails for same compartment
_last_alert_email_times: dict[tuple, float] = {}

ALERT_RULES = {
    "wrong_compartment": {
        "severity": "HIGH",
        "template": "wrong_compartment.html",
        "subject": "MediBridge — Wrong Compartment Alert",
    },
    "reminder_missed": {
        "severity": "MEDIUM",
        "template": "reminder_missed.html",
        "subject": "MediBridge — Reminder Missed",
    },
    "stock_empty": {
        "severity": "HIGH",
        "template": "stock_empty.html",
        "subject": "MediBridge — Medicine Refill Required",
    },
}


async def process_alert(event, db: AsyncSession) -> Optional[int]:
    """
    Create an alert record and trigger email notification if applicable.
    Returns alert.id or None.
    """
    from models import Alert, Caregiver, Compartment, Device, Patient
    from services.email_service import send_alert_email

    rule = ALERT_RULES.get(event.event_type)
    if not rule:
        return None

    # Avoid duplicate alerts for the same event
    existing = await db.execute(
        select(Alert).where(Alert.event_id == event.event_id)
    )
    if existing.scalar_one_or_none():
        logger.debug("Alert already exists for event_id=%s", event.event_id)
        return None

    alert = Alert(
        event_id=event.event_id,
        alert_type=event.event_type,
        severity=rule["severity"],
        message=_build_message(event),
        compartment_id=event.compartment_id,
        device_id=event.device_id,
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    await db.flush()

    # Find caregiver email for this device
    dev_result = await db.execute(
        select(Device).where(Device.device_id == event.device_id)
    )
    device = dev_result.scalar_one_or_none()

    patient = None
    caregivers = []
    compartment_name = "Unknown"

    if device and device.patient_id:
        pat_result = await db.execute(
            select(Patient).where(Patient.id == device.patient_id)
        )
        patient = pat_result.scalar_one_or_none()

        cg_result = await db.execute(
            select(Caregiver).where(
                Caregiver.patient_id == device.patient_id,
            )
        )
        caregivers = cg_result.scalars().all()

        # Compartment name
        comp_result = await db.execute(
            select(Compartment).where(
                Compartment.device_id == device.id,
                Compartment.compartment_number == event.compartment_id,
            )
        )
        comp = comp_result.scalar_one_or_none()
        if comp and comp.medicine_name:
            compartment_name = comp.medicine_name

    if event.detail and "boot" in event.detail.lower():
        logger.info("Suppressed email for boot-time event: %s", event.event_id)
        await db.commit()
        return alert.id

    # Anti-spam cooldown check per (device_id, alert_type, compartment_id)
    cooldown_key = (event.device_id, event.event_type, event.compartment_id)
    now_sec = time.time()
    if cooldown_key in _last_alert_email_times:
        elapsed = now_sec - _last_alert_email_times[cooldown_key]
        if elapsed < _EMAIL_COOLDOWN_SECONDS:
            logger.info(
                "Anti-spam: Email for %s (C%s) suppressed (sent %.0fs ago, cooldown %ss).",
                event.event_type, event.compartment_id, elapsed, _EMAIL_COOLDOWN_SECONDS
            )
            await db.commit()
            return alert.id

    _last_alert_email_times[cooldown_key] = now_sec

    if caregivers:
        ctx = {
            "patient_name": patient.name if patient else "Unknown",
            "medicine_name": compartment_name,
            "compartment_id": event.compartment_id,
            "device_id": event.device_id,
            "event_type": event.event_type,
            "timestamp": event.device_timestamp or str(event.received_at),
            "detail": event.detail or "",
        }
        for cg in caregivers:
            if cg.email:
                await send_alert_email(
                    event_id=event.event_id,
                    template_name=rule["template"],
                    subject=rule["subject"],
                    recipient=cg.email,
                    context=ctx,
                    db=db,
                )
    else:
        logger.info("No caregivers found for device=%s — email skipped.", event.device_id)

    await db.commit()
    logger.info("Alert created [%s] %s for event %s", rule["severity"], event.event_type, event.event_id)

    # Broadcast alert over WebSocket
    try:
        from services.websocket_manager import ws_manager
        await ws_manager.broadcast({
            "type": "alert",
            "data": {
                "id": alert.id,
                "event_id": alert.event_id,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.message,
                "compartment_id": alert.compartment_id,
                "device_id": alert.device_id,
                "resolved": False,
                "resolved_at": None,
                "created_at": str(alert.created_at),
            }
        })
    except Exception as exc:
        logger.debug("WS alert broadcast error: %s", exc)

    return alert.id


def _build_message(event) -> str:
    messages = {
        "wrong_compartment": (
            f"Wrong compartment opened: compartment {event.compartment_id} was accessed "
            f"when a different one was expected. {event.detail or ''}"
        ),
        "reminder_missed": (
            f"Medication reminder missed for compartment {event.compartment_id}. "
            f"The dose was not taken within the grace period."
        ),
        "stock_empty": (
            f"Medicine stock is empty in compartment {event.compartment_id}. "
            f"Please arrange a refill immediately."
        ),
    }
    return messages.get(event.event_type, f"Alert: {event.event_type}")
