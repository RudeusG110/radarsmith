from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import RadarBlip
from app.schemas.blip import BlipPatch, BlipPost
from sqlalchemy import select


class BlipDb:
    def __init__(self, ctx: AppContext) -> None:
        self.__ctx = ctx
        self.__db = ctx.db

    def create(self, radar_id: UUID, quadrant_id: UUID, ring_id: UUID, blip_post: BlipPost) -> RadarBlip:
        """Create a new blip."""
        blip = RadarBlip(
            radar_id=radar_id, quadrant_id=quadrant_id, ring_id=ring_id, name=blip_post.name, description=blip_post.description
        )
        self.__db.add(blip)
        self.__db.commit()
        self.__db.refresh(blip)
        return blip

    def update(self, blip: RadarBlip, patch: BlipPatch) -> RadarBlip:
        """Apply a partial update to a blip and persist the change."""
        blip.name = patch.name or blip.name
        blip.description = patch.description or blip.description
        blip.quadrant_id = patch.quadrant_id or blip.quadrant_id
        blip.ring_id = patch.ring_id or blip.ring_id
        blip.updated_at = self.__ctx.now_utc()
        self.__db.commit()
        self.__db.refresh(blip)
        return blip

    def get_by_id(self, blip_id: UUID) -> RadarBlip | None:
        """Get a blip by ID."""
        statement = select(RadarBlip).where(RadarBlip.id == blip_id)
        return self.__db.scalars(statement).one_or_none()

    def get_for_radar(self, radar_id: UUID, blip_id: UUID) -> RadarBlip | None:
        """Get a blip by ID scoped to the radar it must belong to."""
        statement = select(RadarBlip).where(RadarBlip.id == blip_id, RadarBlip.radar_id == radar_id)
        return self.__db.scalars(statement).one_or_none()

    def delete(self, blip: RadarBlip) -> None:
        self.__db.delete(blip)
        self.__db.commit()
