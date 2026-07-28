from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import RadarQuadrant
from app.schemas.quadrant import QuadrantPost
from sqlalchemy import select


class QuadrantDb:
    def __init__(self, ctx: AppContext) -> None:
        self.__db = ctx.db

    def create(self, radar_id: UUID, quadrant_post: QuadrantPost) -> RadarQuadrant:
        """Create a new quadrant."""
        quadrant = RadarQuadrant(radar_id=radar_id, name=quadrant_post.name, position=quadrant_post.position)
        self.__db.add(quadrant)
        self.__db.flush()
        self.__db.refresh(quadrant)
        return quadrant

    def get_for_radar(self, radar_id: UUID, quadrant_id: UUID) -> RadarQuadrant | None:
        """Get a quadrant by ID scoped to the radar it must belong to."""
        statement = select(RadarQuadrant).where(RadarQuadrant.id == quadrant_id, RadarQuadrant.radar_id == radar_id)
        return self.__db.scalars(statement).one_or_none()
