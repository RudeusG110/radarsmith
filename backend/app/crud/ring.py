from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import RadarRing
from app.schemas.ring import RingPost
from sqlalchemy import select


class RingDb:
    def __init__(self, ctx: AppContext) -> None:
        self.__db = ctx.db

    def create(self, radar_id: UUID, ring_post: RingPost) -> RadarRing:
        """Create a new ring."""
        ring = RadarRing(radar_id=radar_id, name=ring_post.name, position=ring_post.position)
        self.__db.add(ring)
        self.__db.flush()
        self.__db.refresh(ring)
        return ring

    def get_for_radar(self, radar_id: UUID, ring_id: UUID) -> RadarRing | None:
        """Get a ring by ID scoped to the radar it must belong to."""
        statement = select(RadarRing).where(RadarRing.id == ring_id, RadarRing.radar_id == radar_id)
        return self.__db.scalars(statement).one_or_none()
