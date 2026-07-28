from http import HTTPStatus
from typing import Any

from app.schemas.error import ErrorOut

NOT_FOUND_RESPONSE: dict[int | str, dict[str, Any]] = {
    HTTPStatus.NOT_FOUND: {"model": ErrorOut, "description": "The requested resource was not found."}
}

VALIDATION_RESPONSE: dict[int | str, dict[str, Any]] = {
    HTTPStatus.UNPROCESSABLE_ENTITY: {"model": ErrorOut, "description": "The request failed validation."}
}

CONFLICT_RESPONSE: dict[int | str, dict[str, Any]] = {
    HTTPStatus.CONFLICT: {"model": ErrorOut, "description": "The request conflicts with the current state."}
}

# Body-only endpoints (create) can only fail validation of their payload.
BODY_ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {**VALIDATION_RESPONSE}

# Identifier-scoped endpoints can fail on an unknown resource or on validation.
IDENTIFIED_ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {**NOT_FOUND_RESPONSE, **VALIDATION_RESPONSE}
