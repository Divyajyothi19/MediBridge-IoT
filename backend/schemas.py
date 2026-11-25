"""
MediBridge Backend — schemas.py
Pydantic v2 schemas for request/response validation.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator


# ── Patient ────────────────────────────────────────────────────────────────────

class PatientBase(BaseModel):
    name: str
    age: Optional[int] = None
    medical_notes: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    medical_notes: Optional[str] = None


class PatientOut(PatientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# ── Caregiver ──────────────────────────────────────────────────────────────────

class CaregiverBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    patient_id: int
    relationship: Optional[str] = None
    is_primary: bool = False


class CaregiverCreate(CaregiverBase):
    pass


class CaregiverUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None
    is_primary: Optional[bool] = None


class CaregiverOut(CaregiverBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ── Medicine ───────────────────────────────────────────────────────────────────

class MedicineBase(BaseModel):
    name: str
    description: Optional[str] = None
    dosage_unit: Optional[str] = None
    compartment_id: Optional[int] = None


class MedicineCreate(MedicineBase):
    pass


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    dosage_unit: Optional[str] = None
    compartment_id: Optional[int] = None


class MedicineOut(MedicineBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ── Device ─────────────────────────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    device_id: str
    patient_id: Optional[int] = None
    name: Optional[str] = None
    firmware_version: Optional[str] = None


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    device_id: str
    patient_id: Optional[int] = None
    name: Optional[str] = None
    is_online: bool = False
    last_heartbeat_at: Optional[datetime] = None
    firmware_version: Optional[str] = None
    registered_at: Optional[datetime] = None


class DeviceStatus(BaseModel):
    device_id: str
    is_online: bool
    last_heartbeat_at: Optional[datetime] = None
    firmware_version: Optional[str] = None


# ── Compartment ────────────────────────────────────────────────────────────────

class CompartmentUpdate(BaseModel):
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    schedule_time: Optional[str] = None
    stock_percent: Optional[float] = None
    stock_status: Optional[str] = None
    state_label: Optional[str] = None


class CompartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    device_id: int
    compartment_number: int
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    schedule_time: Optional[str] = None
    lid_open: bool = False
    stock_percent: float = 100.0
    stock_status: str = "FULL"
    reminder_active: bool = False
    last_interaction_at: Optional[datetime] = None
    state_label: str = "OK"
    updated_at: Optional[datetime] = None


# ── Schedule ───────────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    compartment_id: int
    scheduled_time: str
    days_of_week: Optional[str] = "1,2,3,4,5,6,7"
    is_active: bool = True
    grace_period_minutes: int = 30


class ScheduleOut(ScheduleCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ── Event ──────────────────────────────────────────────────────────────────────

class EventIngest(BaseModel):
    """Firmware event payload (matches event_examples.json schema)."""
    schema_version: Optional[int] = None
    event_id: str
    device_id: str
    compartment_id: int
    event_type: str
    sensor_value: Optional[int] = None
    timestamp: Optional[str] = None
    time_synced: Optional[bool] = None
    uptime_ms: Optional[int] = None
    detail: Optional[str] = None

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        valid = {
            "device_started", "compartment_opened", "compartment_closed",
            "wrong_compartment", "reminder_started", "reminder_stopped",
            "reminder_missed", "stock_changed", "stock_empty",
        }
        if v not in valid:
            raise ValueError(f"Unknown event_type: {v}")
        return v


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    event_id: str
    device_id: str
    compartment_id: int
    event_type: str
    sensor_value: Optional[int] = None
    device_timestamp: Optional[str] = None
    time_synced: Optional[bool] = None
    uptime_ms: Optional[int] = None
    detail: Optional[str] = None
    received_at: datetime


# ── Alert ──────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: Optional[str] = None
    alert_type: str
    severity: str
    message: str
    compartment_id: Optional[int] = None
    device_id: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ── Notification ───────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: Optional[str] = None
    channel: str
    recipient: str
    status: str
    error: Optional[str] = None
    sent_at: Optional[datetime] = None


# ── Reports ────────────────────────────────────────────────────────────────────

class AdherenceReport(BaseModel):
    device_id: str
    total_reminders: int
    taken: int
    missed: int
    adherence_pct: float


class StockHistoryEntry(BaseModel):
    compartment_id: int
    medicine_name: Optional[str]
    event_type: str
    sensor_value: Optional[int]
    received_at: datetime


class EventSummary(BaseModel):
    event_type: str
    count: int


# ── Blynk control ─────────────────────────────────────────────────────────────

class ReminderRequest(BaseModel):
    compartment_id: int


class BuzzerRequest(BaseModel):
    action: str  # "mute" | "test"
