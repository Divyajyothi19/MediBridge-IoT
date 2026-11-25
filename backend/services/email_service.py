"""
MediBridge Backend — services/email_service.py
Sends HTML email alerts via Gmail SMTP (STARTTLS, port 587).
  - 3 retry attempts with 5-second backoff
  - Duplicate prevention: checks notifications table for existing event_id
  - Records outcome (sent/failed) in notifications table
"""
import asyncio
import logging
import os
import smtplib
import ssl
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("medibridge.email")

TEMPLATE_DIR = Path(__file__).parent.parent / "email_templates"

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
MAX_RETRIES = 3
RETRY_BACKOFF = 5  # seconds


def _load_template(name: str, context: Dict[str, Any]) -> str:
    """Load an HTML template and do simple {{var}} substitution."""
    tpl_path = TEMPLATE_DIR / name
    if not tpl_path.exists():
        # Fallback: plain text
        return f"MediBridge Alert\n\n{context}"
    text = tpl_path.read_text(encoding="utf-8")
    for k, v in context.items():
        text = text.replace(f"{{{{{k}}}}}", str(v))
    return text


async def send_alert_email(
    event_id: str,
    template_name: str,
    subject: str,
    recipient: str,
    context: Dict[str, Any],
    db,  # AsyncSession
) -> bool:
    """
    Send an HTML alert email.  Returns True if sent, False on failure.
    Checks for duplicates; records result in notifications table.
    """
    from models import Notification
    from sqlalchemy import select

    sender = os.getenv("GMAIL_SENDER_ADDRESS", "")
    app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    enabled = os.getenv("CAREGIVER_EMAIL_ENABLED", "false").lower() == "true"

    # Duplicate check per recipient
    result = await db.execute(
        select(Notification).where(
            Notification.event_id == event_id,
            Notification.recipient == recipient,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        logger.info("Email already sent for event_id=%s to %s — skipping.", event_id, recipient)
        return True

    if not enabled:
        logger.info(
            "Email disabled (CAREGIVER_EMAIL_ENABLED=false). Would send '%s' to %s",
            subject, recipient,
        )
        # Still record as 'skipped'
        notif = Notification(
            event_id=event_id,
            channel="email",
            recipient=recipient,
            status="skipped",
            error="CAREGIVER_EMAIL_ENABLED=false",
            sent_at=datetime.utcnow(),
        )
        db.add(notif)
        await db.commit()
        return True

    if not sender or not app_password or sender == "your.gmail@gmail.com":
        logger.warning("SMTP credentials not configured — skipping email.")
        notif = Notification(
            event_id=event_id,
            channel="email",
            recipient=recipient,
            status="failed",
            error="SMTP credentials not configured",
            sent_at=datetime.utcnow(),
        )
        db.add(notif)
        await db.commit()
        return False

    html_body = _load_template(template_name, context)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient
    msg.attach(MIMEText(html_body, "html"))

    last_error: Optional[str] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _send_smtp, sender, app_password, recipient, msg)
            logger.info("Email sent to %s (attempt %d)", recipient, attempt)
            notif = Notification(
                event_id=event_id,
                channel="email",
                recipient=recipient,
                status="sent",
                sent_at=datetime.utcnow(),
            )
            db.add(notif)
            await db.commit()
            return True
        except Exception as exc:
            last_error = str(exc)
            logger.warning("Email attempt %d failed: %s", attempt, exc)
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BACKOFF)

    # All retries exhausted
    notif = Notification(
        event_id=event_id,
        channel="email",
        recipient=recipient,
        status="failed",
        error=last_error,
        sent_at=datetime.utcnow(),
    )
    db.add(notif)
    await db.commit()
    return False


def _send_smtp(sender: str, password: str, recipient: str, msg: MIMEMultipart):
    """Blocking SMTP send — run in executor."""
    context = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(sender, password)
        server.sendmail(sender, recipient, msg.as_string())
