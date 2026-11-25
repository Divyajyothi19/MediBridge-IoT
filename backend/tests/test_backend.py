import pytest
import sys
import os
from httpx import AsyncClient, ASGITransport

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import init_db, engine, Base
import models
import schemas


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_root_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "MediBridge API"


@pytest.mark.asyncio
async def test_database_init_and_models():
    await init_db()
    # Check that tables are created
    async with engine.begin() as conn:
        tables = await conn.run_sync(lambda sync_conn: list(Base.metadata.tables.keys()))
        assert "patients" in tables
        assert "caregivers" in tables
        assert "devices" in tables
        assert "compartments" in tables
        assert "events" in tables
        assert "alerts" in tables
        assert "notifications" in tables


def test_caregiver_relationship_model():
    # Verify Caregiver model attributes without 'Column' object is not callable error
    caregiver = models.Caregiver(
        name="Test Caregiver",
        email="caregiver@test.com",
        relationship="Daughter"
    )
    assert caregiver.name == "Test Caregiver"
    assert caregiver.relationship == "Daughter"


@pytest.mark.asyncio
async def test_caregiver_crud_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a patient first
        pat_res = await client.post("/api/patients", json={
            "name": "Test Patient",
            "age": 70,
            "medical_notes": "None"
        })
        assert pat_res.status_code == 201
        patient_id = pat_res.json()["id"]

        # 2. Add Caregiver 1
        cg1_res = await client.post("/api/caregivers", json={
            "name": "Caregiver One",
            "email": "cg1@example.com",
            "phone": "+1234567890",
            "relationship": "Son",
            "patient_id": patient_id,
            "is_primary": True
        })
        assert cg1_res.status_code == 201
        cg1_id = cg1_res.json()["id"]

        # 3. Add Caregiver 2 (N caregivers supported)
        cg2_res = await client.post("/api/caregivers", json={
            "name": "Caregiver Two",
            "email": "cg2@example.com",
            "phone": "+0987654321",
            "relationship": "Nurse",
            "patient_id": patient_id,
            "is_primary": False
        })
        assert cg2_res.status_code == 201
        cg2_id = cg2_res.json()["id"]

        # 4. Update Caregiver 1 email and phone
        up_res = await client.put(f"/api/caregivers/{cg1_id}", json={
            "email": "updated_cg1@example.com",
            "phone": "+1122334455"
        })
        assert up_res.status_code == 200
        assert up_res.json()["email"] == "updated_cg1@example.com"
        assert up_res.json()["phone"] == "+1122334455"

        # 5. List caregivers
        list_res = await client.get("/api/caregivers")
        assert list_res.status_code == 200
        cg_ids = [c["id"] for c in list_res.json()]
        assert cg1_id in cg_ids
        assert cg2_id in cg_ids

        # 6. Delete Caregiver 2
        del_res = await client.delete(f"/api/caregivers/{cg2_id}")
        assert del_res.status_code == 204

        # Verify Caregiver 2 is deleted
        get_res = await client.get(f"/api/caregivers/{cg2_id}")
        assert get_res.status_code == 404

