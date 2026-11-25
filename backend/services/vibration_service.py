"""
MediBridge Backend — services/vibration_service.py
Stub / future interface for BLE vibration wristband alerts.

## How real BLE would connect (future work)
1. Install bleak: `pip install bleak`
2. Scan for the wristband by its BLE MAC or service UUID.
3. Connect via `bleak.BleakClient(address)`.
4. Write a characteristic value to trigger vibration:
       await client.write_gatt_char(VIBRATE_CHAR_UUID, bytes([1]))
5. Wrap in a service with retry logic (device may be temporarily out of range).

For now, `simulate_alert()` always returns a demo response so the rest of the
system can call it without errors.
"""
import logging

logger = logging.getLogger("medibridge.vibration")


async def simulate_alert(compartment_id: int, alert_type: str) -> dict:
    """
    Stub: pretend to send a vibration alert to a wristband.
    Always succeeds in demo mode.
    """
    logger.info(
        "[DEMO] Vibration alert simulated — compartment=%d, type=%s",
        compartment_id, alert_type,
    )
    return {
        "status": "demo",
        "message": "Vibration alert simulated (BLE not connected).",
        "compartment_id": compartment_id,
        "alert_type": alert_type,
    }


async def send_vibration_alert(device_mac: str, compartment_id: int) -> dict:
    """
    Placeholder for real BLE alert.
    Replace the body below with actual bleak code when hardware is available.
    """
    logger.warning("send_vibration_alert() called but BLE is not implemented yet.")
    return await simulate_alert(compartment_id, "ble_placeholder")
