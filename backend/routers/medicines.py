"""routers/medicines.py"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Medicine
from schemas import MedicineCreate, MedicineOut, MedicineUpdate

router = APIRouter()


@router.get("/medicines", response_model=List[MedicineOut])
async def list_medicines(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Medicine))
    return result.scalars().all()


@router.post("/medicines", response_model=MedicineOut, status_code=201)
async def create_medicine(payload: MedicineCreate, db: AsyncSession = Depends(get_db)):
    med = Medicine(**payload.model_dump())
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med


@router.get("/medicines/{med_id}", response_model=MedicineOut)
async def get_medicine(med_id: int, db: AsyncSession = Depends(get_db)):
    med = await db.get(Medicine, med_id)
    if not med:
        raise HTTPException(404, "Medicine not found")
    return med


@router.put("/medicines/{med_id}", response_model=MedicineOut)
async def update_medicine(med_id: int, payload: MedicineUpdate, db: AsyncSession = Depends(get_db)):
    med = await db.get(Medicine, med_id)
    if not med:
        raise HTTPException(404, "Medicine not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(med, k, v)
    await db.commit()
    await db.refresh(med)
    return med


@router.delete("/medicines/{med_id}", status_code=204)
async def delete_medicine(med_id: int, db: AsyncSession = Depends(get_db)):
    med = await db.get(Medicine, med_id)
    if not med:
        raise HTTPException(404, "Medicine not found")
    await db.delete(med)
    await db.commit()
