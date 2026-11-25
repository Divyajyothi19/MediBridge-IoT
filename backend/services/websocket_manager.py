"""
MediBridge Backend — services/websocket_manager.py
Manages active WebSocket connections and broadcasts real-time updates.

Message types:
  event            — raw firmware event
  compartment_state— updated compartment state dict
  alert            — newly created alert
  device_status    — device online/offline change
"""
import asyncio
import json
import logging
from typing import Dict, Any

from fastapi import WebSocket

logger = logging.getLogger("medibridge.ws")


class WebSocketManager:
    def __init__(self):
        self._clients: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._clients.append(ws)
        logger.info("WebSocket client connected. Total: %d", len(self._clients))

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self._clients:
                self._clients.remove(ws)
        logger.info("WebSocket client disconnected. Remaining: %d", len(self._clients))

    async def broadcast(self, message: Dict[str, Any]):
        """Send a JSON message to all connected clients."""
        payload = json.dumps(message, default=str)
        dead: list[WebSocket] = []
        async with self._lock:
            clients_snapshot = list(self._clients)
        for client in clients_snapshot:
            try:
                await client.send_text(payload)
            except Exception:
                dead.append(client)
        if dead:
            async with self._lock:
                for d in dead:
                    self._clients.remove(d)


# Singleton instance used across the app
ws_manager = WebSocketManager()
