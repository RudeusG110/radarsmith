from http import HTTPStatus
from typing import Any, cast
from uuid import UUID

import pytest
from app.context.app_context import AppContext
from app.models.models import RadarBlip, RadarQuadrant, RadarRing
from fastapi.testclient import TestClient
from lib.query_counter import count_queries
from sqlalchemy import Engine, select

MISSING_ID = "c22e9817-d6ff-472a-b5a4-0a521366bb21"


def test_create_radar(client: TestClient) -> None:
    radar_payload = {"name": "Test Radar", "purpose": "This is a test radar."}

    response = client.post("/api/v1/radars", json=radar_payload)
    assert response.status_code == HTTPStatus.CREATED

    body = response.json()
    assert body["name"] == "Test Radar"
    assert body["purpose"] == "This is a test radar."
    assert [quadrant["position"] for quadrant in body["quadrants"]] == [1, 2, 3, 4]
    assert [ring["position"] for ring in body["rings"]] == [1, 2, 3, 4]


def test_create_radar_without_purpose(client: TestClient) -> None:
    response = client.post("/api/v1/radars", json={"name": "No Purpose Radar"})

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["purpose"] is None


def test_create_radar_rejects_blank_name(client: TestClient) -> None:
    response = client.post("/api/v1/radars", json={"name": "   "})

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


def test_get_radars(client: TestClient) -> None:
    radar_payload_1 = {"name": "Radar 1", "purpose": "First radar."}

    client.post("/api/v1/radars", json=radar_payload_1)

    response = client.get("/api/v1/radars")
    assert response.status_code == HTTPStatus.OK

    body = cast(list[dict[str, Any]], response.json())
    assert len(body) == 2
    assert body[0]["name"] == "Radar 1"  # Most recent first
    assert body[1]["name"] == "Test radar"  # Seeded base-table radar
    assert "quadrants" not in body[0]  # List items are lightweight
    assert "rings" not in body[0]
    assert "blips" not in body[0]


@pytest.mark.no_base_tables
def test_get_radars_empty(client: TestClient) -> None:
    response = client.get("/api/v1/radars")
    assert response.status_code == HTTPStatus.OK

    body = cast(list[dict[str, Any]], response.json())
    assert len(body) == 0


def test_get_radar_by_id(client: TestClient) -> None:
    radar_payload = {"name": "Radar by ID", "purpose": "Testing get by ID."}
    create_response = client.post("/api/v1/radars", json=radar_payload)
    radar_id = create_response.json()["id"]

    response = client.get(f"/api/v1/radars/{radar_id}")
    assert response.status_code == HTTPStatus.OK

    body = response.json()
    assert body["id"] == radar_id
    assert body["name"] == "Radar by ID"
    assert body["purpose"] == "Testing get by ID."
    assert [quadrant["position"] for quadrant in body["quadrants"]] == [1, 2, 3, 4]
    assert [ring["position"] for ring in body["rings"]] == [1, 2, 3, 4]
    assert body["blips"] == []


def test_get_radar_by_id_not_found(client: TestClient) -> None:
    response = client.get(f"/api/v1/radars/{MISSING_ID}")
    assert response.status_code == HTTPStatus.NOT_FOUND

    error = response.json()["error"]
    assert error["code"] == "not_found"
    assert error["message"] == f"Radar with ID {MISSING_ID} not found."


def test_get_radar_by_id_invalid_uuid(client: TestClient) -> None:
    response = client.get("/api/v1/radars/invalid-uuid")
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert "Input should be a valid UUID" in response.json()["detail"][0]["msg"]


def test_get_radar_by_id_avoids_n_plus_one(client: TestClient, context: AppContext) -> None:
    create_response = client.post("/api/v1/radars", json={"name": "Dense radar", "purpose": "Many blips."})
    radar_id = cast(str, create_response.json()["id"])

    quadrant = context.db.scalars(select(RadarQuadrant).where(RadarQuadrant.radar_id == UUID(radar_id))).first()
    ring = context.db.scalars(select(RadarRing).where(RadarRing.radar_id == UUID(radar_id))).first()
    assert quadrant is not None
    assert ring is not None

    context.db.add_all(
        [
            RadarBlip(radar_id=UUID(radar_id), quadrant_id=quadrant.id, ring_id=ring.id, name=f"Blip {index}", description="A blip.")
            for index in range(10)
        ]
    )
    context.db.commit()

    engine = context.db.get_bind()
    assert isinstance(engine, Engine)

    with count_queries(engine) as counter:
        response = client.get(f"/api/v1/radars/{radar_id}")

    assert response.status_code == HTTPStatus.OK
    blips = cast(list[dict[str, Any]], response.json()["blips"])
    assert len(blips) == 10
    assert counter.count <= 6  # Constant query count; a per-blip N+1 would far exceed this


def test_update_radar(client: TestClient) -> None:
    radar_payload = {"name": "Radar to Update", "purpose": "Initial purpose."}
    create_response = client.post("/api/v1/radars", json=radar_payload)
    radar_id = create_response.json()["id"]

    update_payload = {"name": "Updated Radar Name", "purpose": "Updated purpose."}
    update_response = client.patch(f"/api/v1/radars/{radar_id}", json=update_payload)

    assert update_response.status_code == HTTPStatus.OK
    updated_radar = update_response.json()
    assert updated_radar["id"] == radar_id
    assert updated_radar["name"] == "Updated Radar Name"
    assert updated_radar["purpose"] == "Updated purpose."


def test_update_radar_not_found(client: TestClient) -> None:
    update_payload = {"name": "Non-existent Radar", "purpose": "This radar does not exist."}
    response = client.patch(f"/api/v1/radars/{MISSING_ID}", json=update_payload)

    assert response.status_code == HTTPStatus.NOT_FOUND
    error = response.json()["error"]
    assert error["code"] == "not_found"
    assert error["message"] == f"Radar with ID {MISSING_ID} not found."


def test_update_radar_invalid_uuid(client: TestClient) -> None:
    update_payload = {"name": "Invalid UUID Radar", "purpose": "Testing invalid UUID."}
    response = client.patch("/api/v1/radars/invalid-uuid", json=update_payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert "Input should be a valid UUID" in response.json()["detail"][0]["msg"]


def test_update_radar_blank_name(client: TestClient) -> None:
    radar_payload = {"name": "Radar to Update", "purpose": "Initial purpose."}
    create_response = client.post("/api/v1/radars", json=radar_payload)
    radar_id = create_response.json()["id"]

    update_payload = {"name": "   ", "purpose": "Updated purpose."}
    response = client.patch(f"/api/v1/radars/{radar_id}", json=update_payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


def test_update_radar_partial_update(client: TestClient) -> None:
    radar_payload = {"name": "Radar to Update", "purpose": "Initial purpose."}
    create_response = client.post("/api/v1/radars", json=radar_payload)
    radar_id = create_response.json()["id"]

    update_payload = {"purpose": "Updated purpose only."}
    update_response = client.patch(f"/api/v1/radars/{radar_id}", json=update_payload)

    assert update_response.status_code == HTTPStatus.OK
    updated_radar = update_response.json()
    assert updated_radar["id"] == radar_id
    assert updated_radar["name"] == "Radar to Update"  # Name remains unchanged
    assert updated_radar["purpose"] == "Updated purpose only."


def test_update_radar_no_changes(client: TestClient) -> None:
    radar_payload = {"name": "Radar to Update", "purpose": "Initial purpose."}
    create_response = client.post("/api/v1/radars", json=radar_payload)
    radar_id = create_response.json()["id"]

    update_payload = {}  # No changes provided
    update_response = client.patch(f"/api/v1/radars/{radar_id}", json=update_payload)

    assert update_response.status_code == HTTPStatus.OK
    updated_radar = update_response.json()
    assert updated_radar["id"] == radar_id
    assert updated_radar["name"] == "Radar to Update"  # Name remains unchanged
    assert updated_radar["purpose"] == "Initial purpose."  # Purpose remains unchanged


def test_delete_radar(client: TestClient) -> None:
    radar_payload = {"name": "Radar to Delete", "purpose": "This radar will be deleted."}
    create_response = client.post("/api/v1/radars", json=radar_payload)
    radar_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/radars/{radar_id}")
    assert delete_response.status_code == HTTPStatus.OK

    # Verify that the radar is no longer retrievable
    get_response = client.get(f"/api/v1/radars/{radar_id}")
    assert get_response.status_code == HTTPStatus.NOT_FOUND


def test_delete_radar_not_found(client: TestClient) -> None:
    response = client.delete(f"/api/v1/radars/{MISSING_ID}")
    assert response.status_code == HTTPStatus.NOT_FOUND

    error = response.json()["error"]
    assert error["code"] == "not_found"
    assert error["message"] == f"Radar with ID {MISSING_ID} not found."


def test_delete_radar_invalid_uuid(client: TestClient) -> None:
    response = client.delete("/api/v1/radars/invalid-uuid")
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert "Input should be a valid UUID" in response.json()["detail"][0]["msg"]


def test_delete_radar_cascade(client: TestClient, context: AppContext) -> None:
    radar_payload = {"name": "Radar to Delete with Blips", "purpose": "This radar will be deleted along with its blips."}
    create_response = client.post("/api/v1/radars", json=radar_payload)
    radar_id = create_response.json()["id"]

    # Add a blip to the radar
    quadrant = context.db.scalars(select(RadarQuadrant).where(RadarQuadrant.radar_id == UUID(radar_id))).first()
    ring = context.db.scalars(select(RadarRing).where(RadarRing.radar_id == UUID(radar_id))).first()
    assert quadrant is not None
    assert ring is not None

    blip = RadarBlip(radar_id=UUID(radar_id), quadrant_id=quadrant.id, ring_id=ring.id, name="Test Blip", description="A test blip.")
    context.db.add(blip)
    context.db.commit()

    # Delete the radar
    delete_response = client.delete(f"/api/v1/radars/{radar_id}")
    assert delete_response.status_code == HTTPStatus.OK

    # Verify that the radar is no longer retrievable
    get_response = client.get(f"/api/v1/radars/{radar_id}")
    assert get_response.status_code == HTTPStatus.NOT_FOUND

    # Verify that the blip is also deleted
    blip_exists = context.db.query(RadarBlip).filter_by(id=blip.id).first()
    assert blip_exists is None


def test_delete_radar_cascade_quadrants_and_rings(client: TestClient, context: AppContext) -> None:
    radar_payload = {
        "name": "Radar to Delete with Quadrants and Rings",
        "purpose": "This radar will be deleted along with its quadrants and rings.",
    }
    create_response = client.post("/api/v1/radars", json=radar_payload)
    radar_id = create_response.json()["id"]

    # Add a quadrant and a ring to the radar
    quadrant = RadarQuadrant(radar_id=UUID(radar_id), name="Test Quadrant", position=1)
    ring = RadarRing(radar_id=UUID(radar_id), name="Test Ring", position=1)
    context.db.add_all([quadrant, ring])
    context.db.commit()

    # Delete the radar
    delete_response = client.delete(f"/api/v1/radars/{radar_id}")
    assert delete_response.status_code == HTTPStatus.OK

    # Verify that the radar is no longer retrievable
    get_response = client.get(f"/api/v1/radars/{radar_id}")
    assert get_response.status_code == HTTPStatus.NOT_FOUND

    # Verify that the quadrant and ring are also deleted
    quadrant_exists = context.db.query(RadarQuadrant).filter_by(id=quadrant.id).first()
    ring_exists = context.db.query(RadarRing).filter_by(id=ring.id).first()
    assert quadrant_exists is None
    assert ring_exists is None


def test_delete_radar_no_cascade_on_other_radars(client: TestClient, context: AppContext) -> None:
    radar_payload_1 = {"name": "Radar 1", "purpose": "First radar."}
    radar_payload_2 = {"name": "Radar 2", "purpose": "Second radar."}

    create_response_1 = client.post("/api/v1/radars", json=radar_payload_1)
    create_response_2 = client.post("/api/v1/radars", json=radar_payload_2)

    radar_id_1 = create_response_1.json()["id"]
    radar_id_2 = create_response_2.json()["id"]

    # Delete the first radar
    delete_response = client.delete(f"/api/v1/radars/{radar_id_1}")
    assert delete_response.status_code == HTTPStatus.OK

    # Verify that the first radar is no longer retrievable
    get_response_1 = client.get(f"/api/v1/radars/{radar_id_1}")
    assert get_response_1.status_code == HTTPStatus.NOT_FOUND

    # Verify that the second radar is still retrievable
    get_response_2 = client.get(f"/api/v1/radars/{radar_id_2}")
    assert get_response_2.status_code == HTTPStatus.OK
