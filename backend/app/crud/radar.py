from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import Radar
from app.schemas.radar import RadarPost
from sqlalchemy import select
from sqlalchemy.orm import selectinload


class RadarDb:
    def __init__(self, ctx: AppContext) -> None:
        self.__db = ctx.db

    def create(self, radar_post: RadarPost) -> Radar:
        """Create a new radar."""
        radar = Radar(name=radar_post.name, purpose=radar_post.purpose)
        self.__db.add(radar)
        self.__db.flush()
        self.__db.refresh(radar)
        return radar

    def get_all(self) -> list[Radar]:
        """Get all radars, newest first with a stable tie-break."""
        statement = select(Radar).order_by(Radar.created_at.desc(), Radar.id)
        return list(self.__db.scalars(statement).all())

    def get_by_id(self, radar_id: UUID) -> Radar | None:
        """Get a radar with its ordered quadrants, rings, and blips by ID."""
        statement = (
            select(Radar)
            .where(Radar.id == radar_id)
            .options(selectinload(Radar.quadrants), selectinload(Radar.rings), selectinload(Radar.blips))
        )
        return self.__db.scalars(statement).one_or_none()
