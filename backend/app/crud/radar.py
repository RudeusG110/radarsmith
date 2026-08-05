from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import Radar
from app.schemas.radar import RadarPatch, RadarPost
from sqlalchemy import select
from sqlalchemy.orm import selectinload


class RadarDb:
    def __init__(self, ctx: AppContext) -> None:
        self.__ctx = ctx
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
        statement = select(Radar).order_by(Radar.created_at.desc(), Radar.id).options(selectinload(Radar.blips))
        return list(self.__db.scalars(statement).all())

    def get_by_id(self, radar_id: UUID) -> Radar | None:
        """Get a radar with its ordered quadrants, rings, and blips by ID."""
        statement = (
            select(Radar)
            .where(Radar.id == radar_id)
            .options(selectinload(Radar.quadrants), selectinload(Radar.rings), selectinload(Radar.blips))
        )
        return self.__db.scalars(statement).one_or_none()

    def update(self, radar: Radar, patch: RadarPatch) -> Radar:
        """Apply a partial update to a radar and persist the change."""
        radar.name = patch.name or radar.name
        # `purpose` is nullable and may be explicitly cleared, so `or` (which
        # cannot tell an omitted field from a null that clears it) does not apply.
        if "purpose" in patch.model_fields_set:
            radar.purpose = patch.purpose
        radar.updated_at = self.__ctx.now_utc()
        self.__db.commit()
        self.__db.refresh(radar)
        return radar

    def delete(self, radar: Radar) -> None:
        """Delete a radar."""
        self.__db.delete(radar)
        self.__db.commit()
