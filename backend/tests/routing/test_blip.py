from http import HTTPStatus
from typing import cast
from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import RadarQuadrant, RadarRing
from fastapi.testclient import TestClient
from sqlalchemy import select

MISSING_ID = "c22e9817-d6ff-472a-b5a4-0a521366bb21"


def _create_radar(client: TestClient, context: AppContext, name: str = "Blip radar") -> tuple[str, list[str], list[str]]:
    """Create a radar and return its ID with its ordered quadrant and ring IDs."""
    radar_id: str = client.post("/api/v1/radars", json={"name": name}).json()["id"]

    quadrants = context.db.scalars(
        select(RadarQuadrant).where(RadarQuadrant.radar_id == UUID(radar_id)).order_by(RadarQuadrant.position)
    ).all()
    rings = context.db.scalars(select(RadarRing).where(RadarRing.radar_id == UUID(radar_id)).order_by(RadarRing.position)).all()

    return radar_id, [str(quadrant.id) for quadrant in quadrants], [str(ring.id) for ring in rings]


def _blip_payload(quadrant_id: str, ring_id: str, name: str = "GraphQL", description: str = "A query language.") -> dict[str, str]:
    return {"name": name, "description": description, "quadrant_id": quadrant_id, "ring_id": ring_id}


def test_create_blip(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)

    response = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0]))

    assert response.status_code == HTTPStatus.CREATED
    body = cast(dict[str, str], response.json())
    assert UUID(body["id"])  # stable, valid UUID
    assert body["radar_id"] == radar_id
    assert body["quadrant_id"] == quadrants[0]
    assert body["ring_id"] == rings[0]
    assert body["name"] == "GraphQL"
    assert body["description"] == "A query language."
    assert body["created_at"] is not None
    assert body["updated_at"] is not None


def test_create_blip_allows_duplicate_names(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    payload = _blip_payload(quadrants[0], rings[0], name="Repeated")

    first = client.post(f"/api/v1/radars/{radar_id}/blips", json=payload)
    second = client.post(f"/api/v1/radars/{radar_id}/blips", json=payload)

    assert first.status_code == HTTPStatus.CREATED
    assert second.status_code == HTTPStatus.CREATED
    assert first.json()["id"] != second.json()["id"]


def test_create_blip_requires_all_fields(client: TestClient, context: AppContext) -> None:
    radar_id, _, _ = _create_radar(client, context)

    response = client.post(f"/api/v1/radars/{radar_id}/blips", json={"name": "Missing placement"})

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


def test_create_blip_rejects_blank_name(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    payload = _blip_payload(quadrants[0], rings[0], name="   ")

    response = client.post(f"/api/v1/radars/{radar_id}/blips", json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


def test_create_blip_rejects_blank_description(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    payload = _blip_payload(quadrants[0], rings[0], description="   ")

    response = client.post(f"/api/v1/radars/{radar_id}/blips", json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


def test_create_blip_radar_not_found(client: TestClient, context: AppContext) -> None:
    _, quadrants, rings = _create_radar(client, context)

    response = client.post(f"/api/v1/radars/{MISSING_ID}/blips", json=_blip_payload(quadrants[0], rings[0]))

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["message"] == f"Radar with ID {MISSING_ID} not found."


def test_create_blip_rejects_quadrant_from_other_radar(client: TestClient, context: AppContext) -> None:
    radar_id, _, rings = _create_radar(client, context, name="Radar A")
    _, other_quadrants, _ = _create_radar(client, context, name="Radar B")

    response = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(other_quadrants[0], rings[0]))

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["message"] == f"Quadrant with ID {other_quadrants[0]} not found."


def test_create_blip_rejects_ring_from_other_radar(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, _ = _create_radar(client, context, name="Radar A")
    _, _, other_rings = _create_radar(client, context, name="Radar B")

    response = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], other_rings[0]))

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["message"] == f"Ring with ID {other_rings[0]} not found."


def test_update_blip_content_only(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.patch(f"/api/v1/radars/{radar_id}/blips/{created['id']}", json={"name": "Renamed", "description": "Updated text."})

    assert response.status_code == HTTPStatus.OK
    body = response.json()
    assert body["name"] == "Renamed"
    assert body["description"] == "Updated text."
    assert body["quadrant_id"] == quadrants[0]  # placement unchanged
    assert body["ring_id"] == rings[0]
    assert body["updated_at"] > created["updated_at"]


def test_update_blip_placement_only(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.patch(f"/api/v1/radars/{radar_id}/blips/{created['id']}", json={"quadrant_id": quadrants[1], "ring_id": rings[1]})

    assert response.status_code == HTTPStatus.OK
    body = response.json()
    assert body["quadrant_id"] == quadrants[1]
    assert body["ring_id"] == rings[1]
    assert body["name"] == created["name"]  # content unchanged
    assert body["description"] == created["description"]
    assert body["updated_at"] > created["updated_at"]


def test_update_blip_combined(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.patch(
        f"/api/v1/radars/{radar_id}/blips/{created['id']}",
        json={"name": "Combined", "description": "New.", "quadrant_id": quadrants[1], "ring_id": rings[1]},
    )

    assert response.status_code == HTTPStatus.OK
    body = response.json()
    assert body["name"] == "Combined"
    assert body["description"] == "New."
    assert body["quadrant_id"] == quadrants[1]
    assert body["ring_id"] == rings[1]


def test_update_blip_not_in_radar(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context, name="Owner")
    other_radar_id, _, _ = _create_radar(client, context, name="Other")
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.patch(f"/api/v1/radars/{other_radar_id}/blips/{created['id']}", json={"name": "Nope"})

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["message"] == f"Blip with ID {created['id']} not found."


def test_update_blip_rejects_quadrant_from_other_radar(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context, name="Radar A")
    _, other_quadrants, _ = _create_radar(client, context, name="Radar B")
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.patch(f"/api/v1/radars/{radar_id}/blips/{created['id']}", json={"quadrant_id": other_quadrants[0]})

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["message"] == f"Quadrant with ID {other_quadrants[0]} not found."


def test_update_blip_rejects_blank_name(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.patch(f"/api/v1/radars/{radar_id}/blips/{created['id']}", json={"name": "   "})

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
