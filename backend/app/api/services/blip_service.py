from uuid import UUID

from app.context.app_context import AppContext
from app.crud.blip import BlipDb
from app.crud.quadrant import QuadrantDb
from app.crud.radar import RadarDb
from app.crud.ring import RingDb
from app.domain.exceptions import BlipNotFoundError, QuadrantNotFoundError, RadarNotFoundError, RingNotFoundError
from app.models.models import RadarBlip
from app.schemas.blip import BlipPatch, BlipPost


class BlipService:
    def __init__(self, ctx: AppContext) -> None:
        self.__radar_db = RadarDb(ctx)
        self.__quadrant_db = QuadrantDb(ctx)
        self.__ring_db = RingDb(ctx)
        self.__blip_db = BlipDb(ctx)

    def create_blip(self, radar_id: UUID, blip_post: BlipPost) -> RadarBlip:
        """Create a new blip for a radar after validating its placement."""
        if self.__radar_db.get_by_id(radar_id) is None:
            raise RadarNotFoundError(str(radar_id))

        self.__require_quadrant(radar_id, blip_post.quadrant_id)
        self.__require_ring(radar_id, blip_post.ring_id)

        return self.__blip_db.create(radar_id, blip_post.quadrant_id, blip_post.ring_id, blip_post)

    def update_blip(self, radar_id: UUID, blip_id: UUID, blip_patch: BlipPatch) -> RadarBlip:
        """Apply a partial update to a blip that belongs to the radar."""
        blip = self.__blip_db.get_for_radar(radar_id, blip_id)
        if blip is None:
            raise BlipNotFoundError(str(blip_id))

        if blip_patch.quadrant_id is not None:
            self.__require_quadrant(radar_id, blip_patch.quadrant_id)
        if blip_patch.ring_id is not None:
            self.__require_ring(radar_id, blip_patch.ring_id)

        return self.__blip_db.update(blip, blip_patch)

    def delete_blip(self, radar_id: UUID, blip_id: UUID) -> None:
        """Delete a blip that belongs to the radar."""
        blip = self.__blip_db.get_for_radar(radar_id, blip_id)
        if blip is None:
            raise BlipNotFoundError(str(blip_id))
        self.__blip_db.delete(blip)

    def __require_quadrant(self, radar_id: UUID, quadrant_id: UUID) -> None:
        if self.__quadrant_db.get_for_radar(radar_id, quadrant_id) is None:
            raise QuadrantNotFoundError(str(quadrant_id))

    def __require_ring(self, radar_id: UUID, ring_id: UUID) -> None:
        if self.__ring_db.get_for_radar(radar_id, ring_id) is None:
            raise RingNotFoundError(str(ring_id))
