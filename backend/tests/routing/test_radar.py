from http import HTTPStatus

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
