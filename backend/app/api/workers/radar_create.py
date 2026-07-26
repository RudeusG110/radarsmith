from app.context.app_context import AppContext
from app.crud.radar import RadarDb
from app.models.models import Radar
from app.schemas.radar import RadarPost


class RadarCreateApi:
    def __init__(self, ctx: AppContext) -> None:
        self.__radar_db = RadarDb(ctx)

    def radar_create(self, radar_post: RadarPost) -> Radar:
        """Create a new radar."""
        return self.__radar_db.create(radar_post)
