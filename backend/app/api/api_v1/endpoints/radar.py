from typing import Annotated

from fastapi import APIRouter, Depends
from starlette.status import HTTP_201_CREATED, HTTP_204_NO_CONTENT

from app.api.api_v1.path_params import RadarId
from app.api.responses import BODY_ERROR_RESPONSES, IDENTIFIED_ERROR_RESPONSES
from app.api.workers.radar import RadarApi
from app.context.app_context import AppContext, get_app_context
from app.schemas.radar import RadarDetailOut, RadarPatch, RadarPost, RadarSummaryOut

router = APIRouter(prefix="/radars")


@router.post("", status_code=HTTP_201_CREATED, description="Create a new radar", responses=BODY_ERROR_RESPONSES)
def create_radar(radar_post: RadarPost, context: Annotated[AppContext, Depends(get_app_context)]) -> RadarDetailOut:
    """Create a new radar."""
    service = RadarApi(context)
    radar = service.create_radar(radar_post)
    return RadarDetailOut.model_validate(radar)


@router.get("", description="Get all radars")
def get_radars(context: Annotated[AppContext, Depends(get_app_context)]) -> list[RadarSummaryOut]:
    """Get all radars."""
    service = RadarApi(context)
    return service.get_radars()


@router.get("/{radar_id}", description="Get a radar by ID", responses=IDENTIFIED_ERROR_RESPONSES)
def get_radar(radar_id: RadarId, context: Annotated[AppContext, Depends(get_app_context)]) -> RadarDetailOut:
    """Get a radar by ID."""
    service = RadarApi(context)
    radar = service.get_radar(radar_id)
    return RadarDetailOut.model_validate(radar)


@router.patch("/{radar_id}", description="Update a radar by ID", responses=IDENTIFIED_ERROR_RESPONSES)
def update_radar(radar_id: RadarId, radar_patch: RadarPatch, context: Annotated[AppContext, Depends(get_app_context)]) -> RadarDetailOut:
    """Update a radar by ID."""
    service = RadarApi(context)
    radar = service.update_radar(radar_id, radar_patch)
    return RadarDetailOut.model_validate(radar)


@router.delete("/{radar_id}", status_code=HTTP_204_NO_CONTENT, description="Delete a radar by ID", responses=IDENTIFIED_ERROR_RESPONSES)
def delete_radar(radar_id: RadarId, context: Annotated[AppContext, Depends(get_app_context)]) -> None:
    """Delete a radar by ID."""
    service = RadarApi(context)
    service.delete_radar(radar_id)
