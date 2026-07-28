from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from starlette.status import HTTP_201_CREATED

from app.api.services.blip_service import BlipService
from app.context.app_context import AppContext, get_app_context
from app.schemas.blip import BlipDetailOut, BlipPatch, BlipPost

router = APIRouter(prefix="/radars/{radar_id}/blips")


@router.post("", status_code=HTTP_201_CREATED, description="Create a new blip for a radar")
def create_blip(app_context: Annotated[AppContext, Depends(get_app_context)], radar_id: UUID, blip_post: BlipPost) -> BlipDetailOut:
    """Create a new blip for a radar."""
    blip_api = BlipService(app_context)
    blip = blip_api.create_blip(radar_id, blip_post)
    return BlipDetailOut.model_validate(blip)


@router.patch("/{blip_id}", description="Update a blip by ID")
def update_blip(
    app_context: Annotated[AppContext, Depends(get_app_context)], radar_id: UUID, blip_id: UUID, blip_patch: BlipPatch
) -> BlipDetailOut:
    """Update a blip that belongs to a radar."""
    blip_api = BlipService(app_context)
    blip = blip_api.update_blip(radar_id, blip_id, blip_patch)
    return BlipDetailOut.model_validate(blip)
