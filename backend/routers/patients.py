"""routers/patients.py"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Patient
from schemas import PatientCreate, PatientOut, PatientUpdate

router = APIRouter()


@router.get("/patients", response_model=List[PatientOut])
async def list_patients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient))
    return result.scalars().all()


@router.post("/patients", response_model=PatientOut, status_code=201)
async def create_patient(payload: PatientCreate, db: AsyncSession = Depends(get_db)):
    patient = Patient(**payload.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.get("/patients/{patient_id}", response_model=PatientOut)
async def get_patient(patient_id: int, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    return patient


@router.put("/patients/{patient_id}", response_model=PatientOut)
async def update_patient(patient_id: int, payload: PatientUpdate, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(patient, k, v)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.delete("/patients/{patient_id}", status_code=204)
async def delete_patient(patient_id: int, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    await db.delete(patient)
    await db.commit()
