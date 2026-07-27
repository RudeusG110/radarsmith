from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import RadarBlip
from app.schemas.blip import BlipPost
from sqlalchemy import select


class BlipDb:
    def __init__(self, ctx: AppContext) -> None:
        self.__db = ctx.db

    def create(self, radar_id: UUID, blip_post: BlipPost) -> RadarBlip:
        """Create a new blip."""
        blip = RadarBlip(
            radar_id=radar_id,
            name=blip_post.name,
            description=blip_post.description,
            quadrant_id=blip_post.quadrant_id,
            ring_id=blip_post.ring_id,
        )
        self.__db.add(blip)
        self.__db.commit()
        self.__db.refresh(blip)
        return blip

    def get_by_id(self, blip_id: UUID) -> RadarBlip | None:
        """Get a blip by ID."""
        statement = select(RadarBlip).where(RadarBlip.id == blip_id)
        return self.__db.scalars(statement).one_or_none()
