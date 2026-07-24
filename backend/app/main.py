from fastapi import FastAPI

from app.api.error_handlers import register_exception_handlers
from app.api.router import api_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(title="RadarSmith", version="0.1.0", description="API for RadarSmith application")
    app.include_router(api_router, prefix="/api")
    register_exception_handlers(app)
    return app


app = create_app()
