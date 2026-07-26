from typing import Annotated

from fastapi import APIRouter, Depends
from starlette.status import HTTP_201_CREATED

from app.api.services.radar_service import RadarService
from app.context.app_context import AppContext, get_app_context
from app.schemas.radar import RadarOut, RadarPost

router = APIRouter(prefix="/radars")


@router.post("", status_code=HTTP_201_CREATED, description="Create a new radar")
def create_radar(app_context: Annotated[AppContext, Depends(get_app_context)], radar_post: RadarPost) -> RadarOut:
    """Create a new radar."""
    radar_api = RadarService(app_context)
    radar = radar_api.create_radar(radar_post)
    return RadarOut.model_validate(radar)
