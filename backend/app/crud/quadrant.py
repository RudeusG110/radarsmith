from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import RadarQuadrant
from app.schemas.quadrant import QuadrantPost


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
