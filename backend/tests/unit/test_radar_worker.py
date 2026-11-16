from unittest.mock import patch

import pytest
from app.api.workers.radar import RadarApi
from app.context.app_context import AppContext
from app.models.models import Radar, RadarQuadrant, RadarRing
from app.schemas.radar import RadarPost
from sqlalchemy import func, select


def _count(context: AppContext, model: type[Radar] | type[RadarQuadrant] | type[RadarRing]) -> int:
    return context.db.scalar(select(func.count()).select_from(model)) or 0


def test_create_radar_rolls_back_when_structure_creation_fails(context: AppContext) -> None:
    radar_count_before = _count(context, Radar)
    quadrant_count_before = _count(context, RadarQuadrant)
    ring_count_before = _count(context, RadarRing)

    with patch("app.api.workers.radar.RingDb") as ring_db_type:
        ring_db_type.return_value.create.side_effect = RuntimeError("ring creation failed")

        with pytest.raises(RuntimeError):
            RadarApi(context).create_radar(RadarPost(name="Doomed Radar"))

    context.db.rollback()

    assert _count(context, Radar) == radar_count_before
    assert _count(context, RadarQuadrant) == quadrant_count_before
    assert _count(context, RadarRing) == ring_count_before
