from uuid import UUID

from app.context.app_context import AppContext
from app.crud.blip import BlipDb
from app.crud.radar import RadarDb
from app.domain.exceptions import BlipNotFoundError, RadarNotFoundError
from app.models.models import RadarBlip
from app.schemas.blip import BlipPost


class BlipService:
    def __init__(self, ctx: AppContext) -> None:
        self.__ctx = ctx
        self.__radar_db = RadarDb(ctx)
        self.__blip_db = BlipDb(ctx)

    def create_blip(self, radar_id: UUID, blip_post: BlipPost) -> RadarBlip:
        """Create a new blip for a radar."""
        radar = self.__radar_db.get_by_id(radar_id)
        if not radar:
            raise RadarNotFoundError(str(radar_id))

        return self.__blip_db.create(radar.id, blip_post)

    def update_blip(self, blip_id: UUID, blip_post: BlipPost) -> RadarBlip:
        """Update a blip by ID."""
        blip = self.__blip_db.get_by_id(blip_id)
        if blip is None:
            raise BlipNotFoundError(str(blip_id))

        # TODO: BLIP DESCRIPTION SHOULD BE OPTIONAL, SO ONLY UPDATE IF PROVIDED (SCHEMA UPDATE!)
        blip.name = blip_post.name
        blip.description = blip_post.description if blip_post.description is not None else blip.description
        blip.quadrant_id = blip_post.quadrant_id
        blip.ring_id = blip_post.ring_id

        self.__ctx.db.commit()
        self.__ctx.db.refresh(blip)
        return blip
