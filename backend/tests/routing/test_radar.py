from http import HTTPStatus
from typing import Any, cast
from uuid import UUID

import pytest
from app.context.app_context import AppContext
from app.models.models import RadarBlip, RadarQuadrant, RadarRing
from fastapi.testclient import TestClient
from lib.query_counter import count_queries
from sqlalchemy import Engine, select


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
    missing_id = "c22e9817-d6ff-472a-b5a4-0a521366bb21"
    response = client.get(f"/api/v1/radars/{missing_id}")
    assert response.status_code == HTTPStatus.NOT_FOUND

    error = response.json()["error"]
    assert error["code"] == "not_found"
    assert error["message"] == f"Radar with ID {missing_id} not found."


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
