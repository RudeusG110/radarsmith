from typing import Annotated

from fastapi import APIRouter, Depends
from starlette.status import HTTP_202_ACCEPTED

from app.api.workers.radar_create import RadarCreateApi
from app.context.app_context import AppContext, get_app_context
from app.schemas.radar import RadarPost

router = APIRouter(prefix="/radar")


@router.post("", status_code=HTTP_202_ACCEPTED, description="Create a new radar")
def create_radar(app_context: Annotated[AppContext, Depends(get_app_context)], radar_post: RadarPost) -> None:
    """Create a new radar."""
    radar_api = RadarCreateApi(app_context)
    radar = radar_api.radar_create(radar_post)
    print(radar)
