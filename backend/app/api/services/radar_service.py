from app.context.app_context import AppContext
from app.crud.quadrant import QuadrantDb
from app.crud.radar import RadarDb
from app.crud.ring import RingDb
from app.domain.constants import DEFAULT_QUADRANTS, DEFAULT_RINGS
from app.models.models import Radar
from app.schemas.radar import RadarPost
from fastapi import HTTPException


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

    def get_radar(self, radar_id: str) -> Radar:
        """Get a radar by ID."""
        radar = self.__radar_db.get_by_id(radar_id)
        if not radar:
            raise HTTPException(status_code=404, detail=f"Radar with ID {radar_id} not found.")
        return radar
