from http import HTTPStatus
from typing import Any, cast
from unittest.mock import patch

from app.api.error_handlers import register_exception_handlers
from app.context.app_context import AppContext
from app.domain.exceptions import ConflictError
from app.main import app as main_app
from fastapi import FastAPI
from fastapi.testclient import TestClient

MISSING_ID = "c22e9817-d6ff-472a-b5a4-0a521366bb21"
SENSITIVE_DETAIL = "db-host.internal:5432"


def test_not_found_uses_shared_envelope(client: TestClient, context: AppContext) -> None:
    response = client.get(f"/api/v1/radars/{MISSING_ID}")

    assert response.status_code == HTTPStatus.NOT_FOUND
    body = cast(dict[str, Any], response.json())
    assert body == {"error": {"code": "not_found", "message": f"Radar with ID {MISSING_ID} not found."}}


def test_validation_uses_shared_envelope(client: TestClient, context: AppContext) -> None:
    response = client.post("/api/v1/radars", json={"name": "   "})

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    body = cast(dict[str, Any], response.json())
    assert set(body.keys()) == {"error"}
    assert body["error"]["code"] == "validation_error"
    assert "name" in body["error"]["message"]


def test_validation_envelope_for_invalid_path_parameter(client: TestClient, context: AppContext) -> None:
    response = client.get("/api/v1/radars/not-a-uuid")

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    body = cast(dict[str, Any], response.json())
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"]  # non-empty summary


def test_conflict_uses_shared_envelope() -> None:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    def _boom() -> None:  # pyright: ignore[reportUnusedFunction] -- registered as a route handler
        raise ConflictError("Radar name already exists.")

    response = TestClient(app).get("/boom")

    assert response.status_code == HTTPStatus.CONFLICT
    body = cast(dict[str, Any], response.json())
    assert body == {"error": {"code": "conflict", "message": "Radar name already exists."}}


def test_unhandled_error_returns_internal_error_envelope() -> None:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    def _boom() -> None:  # pyright: ignore[reportUnusedFunction] -- registered as a route handler
        raise RuntimeError(f"connection failed: {SENSITIVE_DETAIL}")

    with patch("app.api.error_handlers.logger") as logger:
        response = TestClient(app).get("/boom")

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    body = cast(dict[str, Any], response.json())
    assert body == {"error": {"code": "internal_error", "message": "An unexpected error occurred."}}
    assert SENSITIVE_DETAIL not in response.text
    # `exception` logs at ERROR with the active stack trace attached.
    logger.exception.assert_called_once_with("Unhandled error on GET /boom")


def test_openapi_declares_shared_error_envelope() -> None:
    document = main_app.openapi()

    schemas = cast(dict[str, Any], document["components"]["schemas"])
    assert "ErrorOut" in schemas
    assert "ErrorDetail" in schemas

    get_radar = cast(dict[str, Any], document["paths"]["/api/v1/radars/{radar_id}"]["get"])
    responses = cast(dict[str, Any], get_radar["responses"])
    for status_code in ("404", "422"):
        schema_ref = responses[status_code]["content"]["application/json"]["schema"]["$ref"]
        assert schema_ref.endswith("/ErrorOut")
