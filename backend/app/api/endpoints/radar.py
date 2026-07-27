from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from starlette.status import HTTP_201_CREATED, HTTP_204_NO_CONTENT

from app.api.services.blip_service import BlipService
from app.api.services.radar_service import RadarService
from app.context.app_context import AppContext, get_app_context
from app.schemas.radar import BlipDetailOut, BlipPost, RadarDetailOut, RadarPatch, RadarPost, RadarSummaryOut

router = APIRouter(prefix="/radars")


@router.post("", status_code=HTTP_201_CREATED, description="Create a new radar")
def create_radar(app_context: Annotated[AppContext, Depends(get_app_context)], radar_post: RadarPost) -> RadarDetailOut:
    """Create a new radar."""
    radar_api = RadarService(app_context)
    radar = radar_api.create_radar(radar_post)
    return RadarDetailOut.model_validate(radar)


@router.get("", description="Get all radars")
def get_radars(app_context: Annotated[AppContext, Depends(get_app_context)]) -> list[RadarSummaryOut]:
    """Get all radars."""
    radar_api = RadarService(app_context)
    radars = radar_api.get_radars()
    return [RadarSummaryOut.model_validate(radar) for radar in radars]


@router.get("/{radar_id}", description="Get a radar by ID")
def get_radar(app_context: Annotated[AppContext, Depends(get_app_context)], radar_id: UUID) -> RadarDetailOut:
    """Get a radar by ID."""
    radar_api = RadarService(app_context)
    radar = radar_api.get_radar(radar_id)
    return RadarDetailOut.model_validate(radar)


@router.patch("/{radar_id}", description="Update a radar by ID")
def update_radar(app_context: Annotated[AppContext, Depends(get_app_context)], radar_id: UUID, radar_patch: RadarPatch) -> RadarDetailOut:
    """Update a radar by ID."""
    radar_api = RadarService(app_context)
    radar = radar_api.update_radar(radar_id, radar_patch)
    return RadarDetailOut.model_validate(radar)


@router.delete("/{radar_id}", status_code=HTTP_204_NO_CONTENT, description="Delete a radar by ID")
def delete_radar(app_context: Annotated[AppContext, Depends(get_app_context)], radar_id: UUID) -> None:
    """Delete a radar by ID."""
    radar_api = RadarService(app_context)
    radar_api.delete_radar(radar_id)


@router.post("/{radar_id}/blips", status_code=HTTP_201_CREATED, description="Create a new blip for a radar")
def create_blip(app_context: Annotated[AppContext, Depends(get_app_context)], radar_id: UUID, blip_post: BlipPost) -> BlipDetailOut:
    """Create a new blip for a radar."""
    blip_api = BlipService(app_context)
    blip = blip_api.create_blip(radar_id, blip_post)
    return BlipDetailOut.model_validate(blip)
