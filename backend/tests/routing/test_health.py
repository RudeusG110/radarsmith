from app.main import create_app
from fastapi.testclient import TestClient


def test_health_returns_healthy() -> None:
    client = TestClient(create_app())

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
