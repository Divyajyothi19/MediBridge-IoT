"""routers/reports.py — Adherence, stock history, event summary."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Event, Compartment
from schemas import AdherenceReport, StockHistoryEntry, EventSummary

router = APIRouter()


@router.get("/reports/adherence", response_model=List[AdherenceReport])
async def adherence_report(
    device_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Compute reminder adherence: total reminders, taken vs missed."""
    stmt = select(Event.device_id, Event.event_type, func.count().label("cnt")).group_by(
        Event.device_id, Event.event_type
    )
    if device_id:
        stmt = stmt.where(Event.device_id == device_id)
    rows = (await db.execute(stmt)).all()

    # Aggregate per device
    agg: dict = {}
    for dev, etype, cnt in rows:
        if dev not in agg:
            agg[dev] = {"total_reminders": 0, "taken": 0, "missed": 0}
        if etype == "reminder_started":
            agg[dev]["total_reminders"] += cnt
        elif etype == "compartment_opened":
            agg[dev]["taken"] += cnt
        elif etype == "reminder_missed":
            agg[dev]["missed"] += cnt

    reports = []
    for dev, counts in agg.items():
        total = counts["total_reminders"] or 1
        pct = round((counts["taken"] / total) * 100, 1)
        reports.append(
            AdherenceReport(
                device_id=dev,
                total_reminders=counts["total_reminders"],
                taken=counts["taken"],
                missed=counts["missed"],
                adherence_pct=pct,
            )
        )
    return reports


@router.get("/reports/stock-history", response_model=List[StockHistoryEntry])
async def stock_history(
    compartment_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Event).where(
        Event.event_type.in_(["stock_changed", "stock_empty"])
    ).order_by(Event.received_at.desc()).limit(limit)
    if compartment_id is not None:
        stmt = stmt.where(Event.compartment_id == compartment_id)
    events = (await db.execute(stmt)).scalars().all()

    result = []
    for ev in events:
        result.append(
            StockHistoryEntry(
                compartment_id=ev.compartment_id,
                medicine_name=None,
                event_type=ev.event_type,
                sensor_value=ev.sensor_value,
                received_at=ev.received_at,
            )
        )
    return result


@router.get("/reports/event-summary", response_model=List[EventSummary])
async def event_summary(
    device_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Event.event_type, func.count().label("cnt")).group_by(Event.event_type)
    if device_id:
        stmt = stmt.where(Event.device_id == device_id)
    rows = (await db.execute(stmt)).all()
    return [EventSummary(event_type=etype, count=cnt) for etype, cnt in rows]
