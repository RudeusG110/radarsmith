from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.status import HTTP_404_NOT_FOUND

from app.domain.exceptions import NotFoundError


async def _handle_not_found(_: Request, exc: Exception) -> JSONResponse:
    """Return the shared not-found error envelope for a missing resource."""
    return JSONResponse(status_code=HTTP_404_NOT_FOUND, content={"error": {"code": "not_found", "message": str(exc)}})


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers for the FastAPI application."""
    app.add_exception_handler(NotFoundError, _handle_not_found)
