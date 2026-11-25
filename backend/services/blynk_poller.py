"""
MediBridge Backend — services/blynk_poller.py
Polls Blynk V10 (JSON event queue) every 1 second.
  - Maintains in-memory set of seen event_ids (deduplicated)
  - Also checks DB for idempotency across restarts
  - If token is placeholder → runs in DEMO MODE with a warning

Blynk V10 is expected to return a JSON string like the firmware event format.
"""
import asyncio
import json
import logging
import os
from typing import Optional

import aiohttp

logger = logging.getLogger("medibridge.poller")

POLL_INTERVAL = 1.0  # seconds
_seen_ids: set[str] = set()
_task: Optional[asyncio.Task] = None

PLACEHOLDER_TOKENS = {"PASTE_YOUR_TOKEN_HERE", "", None}


async def start_poller():
    global _task
    _task = asyncio.create_task(_poll_loop(), name="blynk-poller")
    logger.info("Blynk poller task started.")


async def stop_poller():
    global _task
    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
    logger.info("Blynk poller stopped.")


async def _poll_loop():
    token = os.getenv("BLYNK_AUTH_TOKEN", "PASTE_YOUR_TOKEN_HERE")
    base_url = os.getenv("BLYNK_BASE_URL", "https://blynk.cloud")
    demo_mode = token in PLACEHOLDER_TOKENS or os.getenv("DEMO_MODE", "true").lower() == "true"

    if demo_mode:
        logger.warning(
            "⚠  DEMO MODE: Blynk token is placeholder or DEMO_MODE=true. "
            "No real Blynk polling. Set BLYNK_AUTH_TOKEN in .env to enable live polling."
        )
        # Keep running but do nothing — events come via /api/events/ingest
        while True:
            await asyncio.sleep(60)
        return

    url = f"{base_url}/external/api/get"
    logger.info("Blynk poller: polling V10 every %ss at %s", POLL_INTERVAL, base_url)

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                async with session.get(
                    url, params={"token": token, "v10": ""}, timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        raw = await resp.text()
                        await _handle_v10_payload(raw)
                    else:
                        logger.debug("Blynk V10 poll returned status %d", resp.status)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.debug("Blynk poll error: %s", exc)

            await asyncio.sleep(POLL_INTERVAL)


async def _handle_v10_payload(raw: str):
    """Parse V10 payload and ingest any new events."""
    if not raw or raw in ('""', "null", ""):
        return
    try:
        # V10 may contain a JSON string or a JSON object directly
        data = json.loads(raw)
        if isinstance(data, str):
            data = json.loads(data)
        if isinstance(data, dict):
            await _try_ingest(data)
        elif isinstance(data, list):
            for item in data:
                await _try_ingest(item)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.debug("V10 parse error: %s — raw=%r", exc, raw[:200])


async def _try_ingest(event_data: dict):
    """Ingest a single event dict if not already seen."""
    from database import AsyncSessionLocal
    from services.event_processor import ingest_event

    event_id = event_data.get("event_id")
    if not event_id or event_id in _seen_ids:
        return

    _seen_ids.add(event_id)
    async with AsyncSessionLocal() as db:
        try:
            await ingest_event(event_data, db)
            logger.info("Blynk poller ingested event: %s", event_id)
        except ValueError as exc:
            logger.debug("Skipping event: %s", exc)
        except Exception as exc:
            logger.error("Error ingesting event %s: %s", event_id, exc)
