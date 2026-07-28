from http import HTTPStatus
from typing import cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic_core import ErrorDetails

from app.domain.exceptions import ConflictError, NotFoundError
from app.schemas.error import ErrorDetail, ErrorOut


def _envelope(status_code: int, code: str, message: str) -> JSONResponse:
    """Build a JSON response wrapping the shared error envelope."""
    body = ErrorOut(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status_code, content=body.model_dump())


def _format_validation_errors(exc: RequestValidationError) -> str:
    """Summarise validation failures into one human-readable message."""
    messages: list[str] = []
    for raw_error in exc.errors():
        error = cast(ErrorDetails, raw_error)
        location = ".".join(str(part) for part in error["loc"] if part != "body")
        messages.append(f"{location}: {error['msg']}" if location else error["msg"])
    return "; ".join(messages) if messages else "Request validation failed."


async def _handle_not_found(_: Request, exc: Exception) -> JSONResponse:
    """Return the shared error envelope for a missing resource."""
    return _envelope(HTTPStatus.NOT_FOUND, "not_found", str(exc))


async def _handle_conflict(_: Request, exc: Exception) -> JSONResponse:
    """Return the shared error envelope for a state conflict."""
    return _envelope(HTTPStatus.CONFLICT, "conflict", str(exc))


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    """Return the shared error envelope for request validation failures."""
    message = _format_validation_errors(cast(RequestValidationError, exc))
    return _envelope(HTTPStatus.UNPROCESSABLE_ENTITY, "validation_error", message)


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers for the FastAPI application."""
    app.add_exception_handler(NotFoundError, _handle_not_found)
    app.add_exception_handler(ConflictError, _handle_conflict)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
