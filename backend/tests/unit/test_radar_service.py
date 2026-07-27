from unittest.mock import patch

import pytest
from app.api.services.radar_service import RadarService
from app.context.app_context import AppContext
from app.models.models import Radar, RadarQuadrant, RadarRing
from app.schemas.radar import RadarPost
from sqlalchemy import func, select


def _count(context: AppContext, model: type[Radar] | type[RadarQuadrant] | type[RadarRing]) -> int:
    return context.db.scalar(select(func.count()).select_from(model)) or 0


def test_create_radar_rolls_back_when_structure_creation_fails(context: AppContext) -> None:
    with patch("app.api.services.radar_service.RingDb") as ring_db_type:
        ring_db_type.return_value.create.side_effect = RuntimeError("ring creation failed")

        with pytest.raises(RuntimeError):
            RadarService(context).create_radar(RadarPost(name="Doomed Radar"))

    context.db.rollback()

    assert _count(context, Radar) == 0
    assert _count(context, RadarQuadrant) == 0
    assert _count(context, RadarRing) == 0
