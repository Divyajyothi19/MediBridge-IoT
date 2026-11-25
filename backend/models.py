"""
MediBridge Backend — models.py
SQLAlchemy ORM models for all database tables.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Float,
    DateTime, ForeignKey, Text, func,
)
from sqlalchemy.orm import relationship, relationship as orm_relationship
from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    medical_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())

    caregivers = relationship("Caregiver", back_populates="patient", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="patient", cascade="all, delete-orphan")


class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    relationship = Column(String(100), nullable=True)
    is_primary = Column(Boolean, default=False)

    patient = orm_relationship("Patient", back_populates="caregivers")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    name = Column(String(255), nullable=True)
    is_online = Column(Boolean, default=False)
    last_heartbeat_at = Column(DateTime, nullable=True)
    firmware_version = Column(String(50), nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())

    patient = relationship("Patient", back_populates="devices")
    compartments = relationship("Compartment", back_populates="device", cascade="all, delete-orphan")


class Compartment(Base):
    __tablename__ = "compartments"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    compartment_number = Column(Integer, nullable=False)   # 1, 2, or 3
    medicine_name = Column(String(255), nullable=True)
    dosage = Column(String(100), nullable=True)
    schedule_time = Column(String(10), nullable=True)      # e.g. "08:00"
    lid_open = Column(Boolean, default=False)
    stock_percent = Column(Float, default=100.0)
    stock_status = Column(String(50), default="FULL")       # FULL/MEDIUM/LOW/EMPTY
    reminder_active = Column(Boolean, default=False)
    last_interaction_at = Column(DateTime, nullable=True)
    state_label = Column(String(100), default="OK")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    device = relationship("Device", back_populates="compartments")
    medicines = relationship("Medicine", back_populates="compartment")
    schedules = relationship("Schedule", back_populates="compartment", cascade="all, delete-orphan")


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    dosage_unit = Column(String(50), nullable=True)
    compartment_id = Column(Integer, ForeignKey("compartments.id"), nullable=True)

    compartment = relationship("Compartment", back_populates="medicines")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    compartment_id = Column(Integer, ForeignKey("compartments.id"), nullable=False)
    scheduled_time = Column(String(10), nullable=False)     # "HH:MM"
    days_of_week = Column(String(50), default="1,2,3,4,5,6,7")  # CSV of weekday numbers
    is_active = Column(Boolean, default=True)
    grace_period_minutes = Column(Integer, default=30)

    compartment = relationship("Compartment", back_populates="schedules")


class Event(Base):
    __tablename__ = "events"

    event_id = Column(String(200), primary_key=True, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    compartment_id = Column(Integer, nullable=False)
    event_type = Column(String(100), nullable=False, index=True)
    sensor_value = Column(Integer, nullable=True)
    device_timestamp = Column(String(50), nullable=True)
    time_synced = Column(Boolean, default=False)
    uptime_ms = Column(Integer, nullable=True)
    detail = Column(String(500), nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    raw_json = Column(Text, nullable=False)

    alert = relationship("Alert", back_populates="event", uselist=False)
    notifications = relationship("Notification", back_populates="event", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(200), ForeignKey("events.event_id"), unique=True, nullable=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)           # LOW/MEDIUM/HIGH
    message = Column(Text, nullable=False)
    compartment_id = Column(Integer, nullable=True)
    device_id = Column(String(100), nullable=True)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())

    event = relationship("Event", back_populates="alert")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(200), ForeignKey("events.event_id"), nullable=True)
    channel = Column(String(50), nullable=False)            # email/sms/push
    recipient = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False)             # sent/failed/pending
    error = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)

    event = relationship("Event", back_populates="notifications")
