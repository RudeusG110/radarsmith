from uuid import UUID

from app.context.app_context import AppContext
from app.crud.quadrant import QuadrantDb
from app.crud.radar import RadarDb
from app.crud.ring import RingDb
from app.domain.constants import DEFAULT_QUADRANTS, DEFAULT_RINGS
from app.domain.exceptions import RadarNotFoundError
from app.log.logging import get_logger
from app.models.models import Radar
from app.schemas.radar import RadarPatch, RadarPost, RadarSummaryOut

logger = get_logger()


class RadarApi:
    def __init__(self, ctx: AppContext) -> None:
        self.__ctx = ctx
        self.__radar_db = RadarDb(ctx)
        self.__quadrant_db = QuadrantDb(ctx)
        self.__ring_db = RingDb(ctx)

    def create_radar(self, radar_post: RadarPost) -> Radar:
        """Create a new radar and its default quadrants and rings in one transaction."""
        committed = False
        try:
            radar = self.__radar_db.create(radar_post)

            # create 4 default quadrants and rings for the new radar
            for quadrant in DEFAULT_QUADRANTS:
                self.__quadrant_db.create(radar.id, quadrant)
            for ring in DEFAULT_RINGS:
                self.__ring_db.create(radar.id, ring)

            self.__ctx.db.commit()
            committed = True
        except Exception:
            logger.exception("create radar failed")
            raise
        finally:
            if not committed:
                self.__ctx.db.rollback()

        return radar

    def get_radars(self) -> list[RadarSummaryOut]:
        """Get all radars as summaries, each carrying its own blip count."""
        return [
            RadarSummaryOut(
                id=radar.id,
                name=radar.name,
                purpose=radar.purpose,
                created_at=radar.created_at,
                updated_at=radar.updated_at,
                blip_count=len(radar.blips),
            )
            for radar in self.__radar_db.get_all()
        ]

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

        return self.__radar_db.update(radar, radar_patch)

    def delete_radar(self, radar_id: UUID) -> None:
        """Delete a radar by ID."""
        radar = self.__radar_db.get_by_id(radar_id)
        if radar is None:
            raise RadarNotFoundError(str(radar_id))

        self.__radar_db.delete(radar)
