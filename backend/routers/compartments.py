"""routers/compartments.py"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Compartment
from schemas import CompartmentOut, CompartmentUpdate

router = APIRouter()


@router.get("/compartments/{comp_id}", response_model=CompartmentOut)
async def get_compartment(comp_id: int, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Compartment, comp_id)
    if not comp:
        raise HTTPException(404, "Compartment not found")
    return comp


@router.put("/compartments/{comp_id}", response_model=CompartmentOut)
async def update_compartment(comp_id: int, payload: CompartmentUpdate, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Compartment, comp_id)
    if not comp:
        raise HTTPException(404, "Compartment not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(comp, k, v)
    await db.commit()
    await db.refresh(comp)
    return comp
