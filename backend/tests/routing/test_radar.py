from http import HTTPStatus
from typing import Any

from fastapi.testclient import TestClient


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


# TODO: you mentioned lightweight return or is this okay, i.e. maybe we don't need to return the quadrants and rings, just the radar itself.
# Worried we are returnint to much also on post?
def test_get_radars(client: TestClient) -> None:
    radar_payload_1 = {"name": "Radar 1", "purpose": "First radar."}

    client.post("/api/v1/radars", json=radar_payload_1)

    response = client.get("/api/v1/radars")
    assert response.status_code == HTTPStatus.OK

    body: list[dict[str, Any]] = response.json()
    assert len(body) == 2
    assert body[0]["name"] == "Radar 1"  # Most recent first
    assert body[1]["name"] == "Test radar"  # From BASETABLE


# TODO: how to run without BASETABLE? Should I delete basetable or somekind of setup/teardown?
def test_get_radars_empty(client: TestClient) -> None:
    # Clear the database of radars
    client.delete("/api/v1/radars")

    response = client.get("/api/v1/radars")
    assert response.status_code == HTTPStatus.OK

    body: list[dict[str, Any]] = response.json()
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


def test_get_radar_by_id_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/radars/c22e9817-d6ff-472a-b5a4-0a521366bb21")  # Assuming this ID does not exist
    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["detail"] == "Radar with ID c22e9817-d6ff-472a-b5a4-0a521366bb21 not found."


def test_get_radar_by_id_invalid_uuid(client: TestClient) -> None:
    response = client.get("/api/v1/radars/invalid-uuid")
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert "Input should be a valid UUID" in response.json()["detail"][0]["msg"]
