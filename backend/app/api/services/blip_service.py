from uuid import UUID

from app.context.app_context import AppContext
from app.models.models import RadarBlip
from app.schemas.radar import BlipPost


class BlipService:
    def __init__(self, app_context: AppContext) -> None:
        self.app_context = app_context

    def create_blip(self, radar_id: UUID, blip_post: BlipPost) -> RadarBlip:
        """Create a new blip for a radar."""
        blip = RadarBlip(
            radar_id=radar_id,
            name=blip_post.name,
            description=blip_post.description,
            quadrant_id=blip_post.quadrant_id,
            ring_id=blip_post.ring_id,
        )
        self.app_context.db.add(blip)
        self.app_context.db.commit()
        self.app_context.db.refresh(blip)
        return blip

    def update_blip(self, blip_id: UUID, blip_post: BlipPost) -> RadarBlip:
        """Update a blip by ID."""
        blip = self.app_context.db.query(RadarBlip).get(blip_id)
        if blip is None:
            raise ValueError(f"Blip with ID {blip_id} not found")  # TODO: handler

        # TODO: BLIP DESCRIPTION SHOULD BE OPTIONAL, SO ONLY UPDATE IF PROVIDED (SCHEA UPDATE)
        blip.name = blip_post.name
        blip.description = blip_post.description if blip_post.description is not None else blip.description
        blip.quadrant_id = blip_post.quadrant_id
        blip.ring_id = blip_post.ring_id

        self.app_context.db.commit()
        self.app_context.db.refresh(blip)
        return blip
