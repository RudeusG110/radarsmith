from fastapi import APIRouter

from app.api.api_v1.endpoints import blip, health, radar

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(radar.router, tags=["radars"])
api_router.include_router(blip.router, tags=["blips"])
