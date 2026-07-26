from fastapi import APIRouter

from app.api.endpoints import health, radar

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(radar.router, tags=["radars"])
