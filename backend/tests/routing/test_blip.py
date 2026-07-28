from http import HTTPStatus
from typing import cast
from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import RadarBlip, RadarQuadrant, RadarRing
from fastapi.testclient import TestClient
from sqlalchemy import func, select

MISSING_ID = "c22e9817-d6ff-472a-b5a4-0a521366bb21"


def _create_radar(client: TestClient, context: AppContext, name: str = "Blip radar") -> tuple[str, list[str], list[str]]:
    """Create a radar and return its ID with its ordered quadrant and ring IDs."""
    radar_id = cast(str, client.post("/api/v1/radars", json={"name": name}).json()["id"])

    quadrants = context.db.scalars(
        select(RadarQuadrant).where(RadarQuadrant.radar_id == UUID(radar_id)).order_by(RadarQuadrant.position)
    ).all()
    rings = context.db.scalars(select(RadarRing).where(RadarRing.radar_id == UUID(radar_id)).order_by(RadarRing.position)).all()

    return radar_id, [str(quadrant.id) for quadrant in quadrants], [str(ring.id) for ring in rings]


def _blip_payload(quadrant_id: str, ring_id: str, name: str = "GraphQL", description: str = "A query language.") -> dict[str, str]:
    return {"name": name, "description": description, "quadrant_id": quadrant_id, "ring_id": ring_id}


def _blip_count(context: AppContext, radar_id: str) -> int:
    return context.db.scalar(select(func.count()).select_from(RadarBlip).where(RadarBlip.radar_id == UUID(radar_id))) or 0


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


def test_delete_blip_removes_blip(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.delete(f"/api/v1/radars/{radar_id}/blips/{created['id']}")

    assert response.status_code == HTTPStatus.NO_CONTENT
    assert not response.content
    assert _blip_count(context, radar_id) == 0


def test_delete_blip_unknown_blip(client: TestClient, context: AppContext) -> None:
    radar_id, _, _ = _create_radar(client, context)

    response = client.delete(f"/api/v1/radars/{radar_id}/blips/{MISSING_ID}")

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["message"] == f"Blip with ID {MISSING_ID} not found."


def test_delete_blip_unknown_radar(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.delete(f"/api/v1/radars/{MISSING_ID}/blips/{created['id']}")

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["message"] == f"Blip with ID {created['id']} not found."
    assert _blip_count(context, radar_id) == 1  # blip untouched


def test_delete_blip_not_through_other_radar(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context, name="Owner")
    other_radar_id, _, _ = _create_radar(client, context, name="Other")
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    response = client.delete(f"/api/v1/radars/{other_radar_id}/blips/{created['id']}")

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["message"] == f"Blip with ID {created['id']} not found."
    assert _blip_count(context, radar_id) == 1  # blip still belongs to its radar


def test_delete_blip_leaves_other_blips_and_structure(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    kept = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0], name="Keep")).json()
    removed = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[1], rings[1], name="Remove")).json()

    response = client.delete(f"/api/v1/radars/{radar_id}/blips/{removed['id']}")

    assert response.status_code == HTTPStatus.NO_CONTENT
    remaining = context.db.scalars(select(RadarBlip).where(RadarBlip.radar_id == UUID(radar_id))).all()
    assert [str(blip.id) for blip in remaining] == [kept["id"]]

    quadrant_count = context.db.scalar(select(func.count()).select_from(RadarQuadrant).where(RadarQuadrant.radar_id == UUID(radar_id)))
    ring_count = context.db.scalar(select(func.count()).select_from(RadarRing).where(RadarRing.radar_id == UUID(radar_id)))
    assert quadrant_count == len(quadrants)  # structure unchanged
    assert ring_count == len(rings)


def test_delete_blip_is_strict_on_second_delete(client: TestClient, context: AppContext) -> None:
    radar_id, quadrants, rings = _create_radar(client, context)
    created = client.post(f"/api/v1/radars/{radar_id}/blips", json=_blip_payload(quadrants[0], rings[0])).json()

    first = client.delete(f"/api/v1/radars/{radar_id}/blips/{created['id']}")
    second = client.delete(f"/api/v1/radars/{radar_id}/blips/{created['id']}")

    assert first.status_code == HTTPStatus.NO_CONTENT
    assert second.status_code == HTTPStatus.NOT_FOUND  # strict, not idempotent
