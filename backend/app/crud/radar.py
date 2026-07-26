from app.context.app_context import AppContext
from app.models.models import Radar
from app.schemas.radar import RadarPost


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
