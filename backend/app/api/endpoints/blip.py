from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from starlette.status import HTTP_201_CREATED

from app.api.services.blip_service import BlipService
from app.context.app_context import AppContext, get_app_context
from app.schemas.blip import BlipDetailOut, BlipPost

router = APIRouter(prefix="/radars/{radar_id}/blips")


@router.post("", status_code=HTTP_201_CREATED, description="Create a new blip for a radar")
def create_blip(app_context: Annotated[AppContext, Depends(get_app_context)], radar_id: UUID, blip_post: BlipPost) -> BlipDetailOut:
    """Create a new blip for a radar."""
    blip_api = BlipService(app_context)
    blip = blip_api.create_blip(radar_id, blip_post)
    return BlipDetailOut.model_validate(blip)


@router.patch("/{blip_id}", description="Update a blip by ID")
def update_blip(app_context: Annotated[AppContext, Depends(get_app_context)], blip_id: UUID, blip_post: BlipPost) -> BlipDetailOut:
    """Update a blip by ID."""
    blip_api = BlipService(app_context)
    blip = blip_api.update_blip(blip_id, blip_post)
    return BlipDetailOut.model_validate(blip)
