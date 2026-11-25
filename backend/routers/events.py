"""routers/events.py"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Event
from schemas import EventIngest, EventOut
from services.event_processor import ingest_event

router = APIRouter()


@router.get("/events", response_model=List[EventOut])
async def list_events(
    device_id: Optional[str] = Query(None),
    compartment_id: Optional[int] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Event)
    if device_id:
        stmt = stmt.where(Event.device_id == device_id)
    if compartment_id is not None:
        stmt = stmt.where(Event.compartment_id == compartment_id)
    if event_type:
        stmt = stmt.where(Event.event_type == event_type)
    stmt = stmt.order_by(Event.received_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/events/ingest", status_code=201)
async def ingest_event_endpoint(payload: EventIngest, db: AsyncSession = Depends(get_db)):
    """
    Internal endpoint — called by the Blynk poller or for testing.
    Ingests a firmware event: persists, updates state, broadcasts WS, fires alerts.
    """
    data = payload.model_dump()
    # Map schema field name
    if "schema_version" in data:
        data.pop("schema_version", None)
    # Rename timestamp → timestamp (keep as is; event_processor uses 'timestamp' key)
    try:
        event = await ingest_event(data, db)
        return {"status": "ingested", "event_id": payload.event_id}
    except ValueError as exc:
        raise HTTPException(409, str(exc))
