"""
MediBridge Backend — seed.py
Demo data seeding — creates SAMPLE DATA if the DB is empty.
"""
import logging
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal

logger = logging.getLogger("medibridge.seed")

SAMPLE_TAG = "[SAMPLE DATA]"


async def seed_demo_data():
    """Seed demo data on first run. All records are clearly marked SAMPLE DATA."""
    async with AsyncSessionLocal() as db:
        from models import Patient, Caregiver, Device, Compartment

        # Only seed if no patients exist
        result = await db.execute(select(func.count()).select_from(Patient))
        count = result.scalar_one()
        if count > 0:
            logger.info("DB already has data — skipping demo seed.")
            return

        logger.info("Seeding SAMPLE DATA for demo…")

        # Patient
        patient = Patient(
            name="Ravi Kumar",
            age=68,
            medical_notes=f"{SAMPLE_TAG} Type-2 Diabetes, Hypertension",
        )
        db.add(patient)
        await db.flush()

        # Caregiver
        caregiver = Caregiver(
            name="Priya Kumar",
            email="priya.kumar@example.com",
            phone="+91-9876543210",
            patient_id=patient.id,
            relationship="Daughter",
            is_primary=True,
        )
        db.add(caregiver)

        # Device
        device = Device(
            device_id="MB-ESP32-01",
            patient_id=patient.id,
            name="MediBridge Dispenser — Bedroom",
            is_online=False,
            firmware_version="1.0.0",
            registered_at=datetime.utcnow(),
        )
        db.add(device)
        await db.flush()

        # Compartments
        compartments_data = [
            (1, "Metformin",     "500mg", "08:00"),
            (2, "Amlodipine",    "5mg",   "14:00"),
            (3, "Atorvastatin",  "10mg",  "20:00"),
        ]
        for num, med, dose, sched in compartments_data:
            comp = Compartment(
                device_id=device.id,
                compartment_number=num,
                medicine_name=f"{med} {SAMPLE_TAG}",
                dosage=dose,
                schedule_time=sched,
                lid_open=False,
                stock_percent=100.0,
                stock_status="FULL",
                reminder_active=False,
                state_label="OK",
            )
            db.add(comp)

        await db.commit()
        logger.info("Demo seed complete: patient='Ravi Kumar', device='MB-ESP32-01', 3 compartments.")
