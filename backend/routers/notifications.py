"""routers/notifications.py"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Notification
from schemas import NotificationOut

router = APIRouter()


@router.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).order_by(Notification.sent_at.desc()))
    return result.scalars().all()
