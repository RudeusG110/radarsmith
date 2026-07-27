from datetime import UTC, datetime
from uuid import UUID

from app.context.app_context import AppContext
from app.crud.quadrant import QuadrantDb
from app.crud.radar import RadarDb
from app.crud.ring import RingDb
from app.domain.constants import DEFAULT_QUADRANTS, DEFAULT_RINGS
from app.domain.exceptions import RadarNotFoundError
from app.models.models import Radar
from app.schemas.radar import RadarPatch, RadarPost


class RadarService:
    def __init__(self, ctx: AppContext) -> None:
        self.__ctx = ctx
        self.__radar_db = RadarDb(ctx)
        self.__quadrant_db = QuadrantDb(ctx)
        self.__ring_db = RingDb(ctx)

    def create_radar(self, radar_post: RadarPost) -> Radar:
        """Create a new radar and its default quadrants and rings."""
        radar = self.__radar_db.create(radar_post)

        # create 4 default quadrants and rings for the new radar
        for quadrant in DEFAULT_QUADRANTS:
            self.__quadrant_db.create(radar.id, quadrant)
        for ring in DEFAULT_RINGS:
            self.__ring_db.create(radar.id, ring)

        self.__ctx.db.commit()
        return radar

    def get_radars(self) -> list[Radar]:
        """Get all radars."""
        return self.__radar_db.get_all()

    def get_radar(self, radar_id: UUID) -> Radar:
        """Get a radar by ID."""
        radar = self.__radar_db.get_by_id(radar_id)
        if radar is None:
            raise RadarNotFoundError(str(radar_id))
        return radar

    def update_radar(self, radar_id: UUID, radar_patch: RadarPatch) -> Radar:
        """Update a radar by ID, applying only the fields the client sent."""
        radar = self.__radar_db.get_by_id(radar_id)
        if radar is None:
            raise RadarNotFoundError(str(radar_id))

        fields = radar_patch.model_dump(exclude_unset=True)
        if fields.get("name") is not None:
            radar.name = fields["name"]
        if "purpose" in fields:
            radar.purpose = fields["purpose"]

        radar.updated_at = datetime.now(UTC)
        self.__ctx.db.commit()
        self.__ctx.db.refresh(radar)
        return radar

    def delete_radar(self, radar_id: UUID) -> None:
        """Delete a radar by ID."""
        radar = self.__radar_db.get_by_id(radar_id)
        if radar is None:
            raise RadarNotFoundError(str(radar_id))

        self.__ctx.db.delete(radar)
        self.__ctx.db.commit()
