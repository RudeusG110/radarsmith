from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.status import HTTP_404_NOT_FOUND

from app.domain.exceptions import RadarNotFoundError


async def _handle_radar_not_found(_request: Request, exc: Exception) -> JSONResponse:
    """Return the shared not-found error envelope for a missing radar."""
    return JSONResponse(status_code=HTTP_404_NOT_FOUND, content={"error": {"code": "not_found", "message": str(exc)}})


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers for the FastAPI application."""
    app.add_exception_handler(RadarNotFoundError, _handle_radar_not_found)
