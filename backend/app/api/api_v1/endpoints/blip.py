from typing import Annotated

from fastapi import APIRouter, Depends
from starlette.status import HTTP_201_CREATED, HTTP_204_NO_CONTENT

from app.api.api_v1.path_params import BlipId, RadarId
from app.api.responses import IDENTIFIED_ERROR_RESPONSES
from app.api.workers.blip import BlipApi
from app.context.app_context import AppContext, get_app_context
from app.schemas.blip import BlipDetailOut, BlipPatch, BlipPost

router = APIRouter(prefix="/radars/{radar_id}/blips")


@router.post("", status_code=HTTP_201_CREATED, description="Create a new blip for a radar", responses=IDENTIFIED_ERROR_RESPONSES)
def create_blip(radar_id: RadarId, blip_post: BlipPost, context: Annotated[AppContext, Depends(get_app_context)]) -> BlipDetailOut:
    """Create a new blip for a radar."""
    service = BlipApi(context)
    blip = service.create_blip(radar_id, blip_post)
    return BlipDetailOut.model_validate(blip)


@router.patch("/{blip_id}", description="Update a blip by ID", responses=IDENTIFIED_ERROR_RESPONSES)
def update_blip(
    radar_id: RadarId, blip_id: BlipId, blip_patch: BlipPatch, context: Annotated[AppContext, Depends(get_app_context)]
) -> BlipDetailOut:
    """Update a blip that belongs to a radar."""
    service = BlipApi(context)
    blip = service.update_blip(radar_id, blip_id, blip_patch)
    return BlipDetailOut.model_validate(blip)


@router.delete("/{blip_id}", status_code=HTTP_204_NO_CONTENT, description="Delete a blip by id", responses=IDENTIFIED_ERROR_RESPONSES)
def delete_blip(radar_id: RadarId, blip_id: BlipId, context: Annotated[AppContext, Depends(get_app_context)]) -> None:
    """Delete a blip from a radar."""
    service = BlipApi(context)
    service.delete_blip(radar_id, blip_id)
