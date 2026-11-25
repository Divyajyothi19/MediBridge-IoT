"""routers/caregivers.py"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Caregiver
from schemas import CaregiverCreate, CaregiverOut, CaregiverUpdate
from services.websocket_manager import ws_manager

router = APIRouter()


@router.get("/caregivers", response_model=List[CaregiverOut])
async def list_caregivers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Caregiver))
    return result.scalars().all()


@router.post("/caregivers", response_model=CaregiverOut, status_code=201)
async def create_caregiver(payload: CaregiverCreate, db: AsyncSession = Depends(get_db)):
    cg = Caregiver(**payload.model_dump())
    db.add(cg)
    await db.commit()
    await db.refresh(cg)
    await ws_manager.broadcast({
        "type": "caregiver_update",
        "action": "created",
        "caregiver": {"id": cg.id, "name": cg.name, "email": cg.email, "phone": cg.phone}
    })
    return cg


@router.get("/caregivers/{cg_id}", response_model=CaregiverOut)
async def get_caregiver(cg_id: int, db: AsyncSession = Depends(get_db)):
    cg = await db.get(Caregiver, cg_id)
    if not cg:
        raise HTTPException(404, "Caregiver not found")
    return cg


@router.put("/caregivers/{cg_id}", response_model=CaregiverOut)
async def update_caregiver(cg_id: int, payload: CaregiverUpdate, db: AsyncSession = Depends(get_db)):
    cg = await db.get(Caregiver, cg_id)
    if not cg:
        raise HTTPException(404, "Caregiver not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cg, k, v)
    await db.commit()
    await db.refresh(cg)
    await ws_manager.broadcast({
        "type": "caregiver_update",
        "action": "updated",
        "caregiver": {"id": cg.id, "name": cg.name, "email": cg.email, "phone": cg.phone}
    })
    return cg


@router.delete("/caregivers/{cg_id}", status_code=204)
async def delete_caregiver(cg_id: int, db: AsyncSession = Depends(get_db)):
    cg = await db.get(Caregiver, cg_id)
    if not cg:
        raise HTTPException(404, "Caregiver not found")
    cg_id_deleted = cg.id
    await db.delete(cg)
    await db.commit()
    await ws_manager.broadcast({
        "type": "caregiver_update",
        "action": "deleted",
        "caregiver_id": cg_id_deleted
    })
