from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.api_v1.api import api_router
from app.api.error_handlers import register_exception_handlers
from app.context.settings_context import get_settings


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(title="RadarSmith", version="0.1.0", description="API for RadarSmith application")
    app.include_router(api_router, prefix="/api/v1")
    register_exception_handlers(app)

    static_dir = get_settings().static_dir
    if static_dir:
        _mount_frontend(app, static_dir)

    return app


def _mount_frontend(app: FastAPI, static_dir: str) -> None:
    """Serve the built frontend and fall back to it for client-side routes."""
    app.mount("/assets", StaticFiles(directory=f"{static_dir}/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:  # pyright: ignore[reportUnusedFunction] -- registered as a route handler
        # Unmatched /api/ paths stay 404s; every other path is a client-side route.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        return FileResponse(f"{static_dir}/index.html")


app = create_app()
