from collections.abc import Mapping
from http import HTTPStatus
from typing import cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic_core import ErrorDetails
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.domain.exceptions import ConflictError, NotFoundError
from app.log.logging import get_logger
from app.schemas.error import ErrorDetail, ErrorOut

logger = get_logger()

INTERNAL_ERROR_MESSAGE = "An unexpected error occurred."
INTEGRITY_ERROR_MESSAGE = "The request conflicts with existing data."


def _envelope(status_code: int, code: str, message: str, headers: Mapping[str, str] | None = None) -> JSONResponse:
    """Build a JSON response wrapping the shared error envelope."""
    body = ErrorOut(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status_code, content=body.model_dump(), headers=headers)


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


async def _handle_integrity_error(request: Request, exc: Exception) -> JSONResponse:
    """Return a conflict for a database constraint violation without leaking database details."""
    logger.warning(f"Integrity error on {request.method} {request.url.path}: {cast(IntegrityError, exc).orig}")
    return _envelope(HTTPStatus.CONFLICT, "conflict", INTEGRITY_ERROR_MESSAGE)


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    """Return the shared error envelope for request validation failures."""
    message = _format_validation_errors(cast(RequestValidationError, exc))
    return _envelope(HTTPStatus.UNPROCESSABLE_ENTITY, "validation_error", message)


async def _handle_http_exception(_: Request, exc: Exception) -> JSONResponse:
    """Return the shared error envelope for framework HTTP errors such as unknown routes."""
    http_exc = cast(StarletteHTTPException, exc)
    status = HTTPStatus(http_exc.status_code)
    message = str(http_exc.detail) if http_exc.detail else status.phrase
    return _envelope(status, status.name.lower(), message, headers=http_exc.headers)


class UnhandledErrorMiddleware:
    """Turn any exception no handler claimed into a logged 500 with the shared error envelope.

    Unlike an ``Exception`` handler, which Starlette re-raises after responding, this keeps
    the failure from reaching the server, so the stack trace is logged exactly once.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def send_tracking_start(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_tracking_start)
        except Exception:
            logger.exception(f"Unhandled error on {scope['method']} {scope['path']}")
            if response_started:
                raise
            response = _envelope(HTTPStatus.INTERNAL_SERVER_ERROR, "internal_error", INTERNAL_ERROR_MESSAGE)
            await response(scope, receive, send)


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers and the unhandled-error fallback for the FastAPI application."""
    app.add_exception_handler(NotFoundError, _handle_not_found)
    app.add_exception_handler(ConflictError, _handle_conflict)
    app.add_exception_handler(IntegrityError, _handle_integrity_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_middleware(UnhandledErrorMiddleware)
