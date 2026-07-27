from app.context.app_context import AppContext
from app.models.models import Radar
from app.schemas.radar import RadarPost


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
        """Get all radars."""
        return self.__db.query(Radar).order_by(Radar.created_at.desc()).all()

    def get_by_id(self, radar_id: str) -> Radar | None:
        """Get a radar by ID."""
        return self.__db.query(Radar).get(radar_id)
