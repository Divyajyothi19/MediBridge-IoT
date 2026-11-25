"""routers/schedules.py"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Schedule
from schemas import ScheduleCreate, ScheduleOut

router = APIRouter()


@router.get("/schedules", response_model=List[ScheduleOut])
async def list_schedules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule))
    return result.scalars().all()


@router.post("/schedules", response_model=ScheduleOut, status_code=201)
async def create_schedule(payload: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    sched = Schedule(**payload.model_dump())
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    return sched


@router.get("/schedules/{sched_id}", response_model=ScheduleOut)
async def get_schedule(sched_id: int, db: AsyncSession = Depends(get_db)):
    sched = await db.get(Schedule, sched_id)
    if not sched:
        raise HTTPException(404, "Schedule not found")
    return sched


@router.delete("/schedules/{sched_id}", status_code=204)
async def delete_schedule(sched_id: int, db: AsyncSession = Depends(get_db)):
    sched = await db.get(Schedule, sched_id)
    if not sched:
        raise HTTPException(404, "Schedule not found")
    await db.delete(sched)
    await db.commit()
