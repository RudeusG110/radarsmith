from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from app.api.services.blip_service import BlipService
from app.api.services.radar_service import RadarService
from app.context.app_context import AppContext
from app.domain.exceptions import BlipNotFoundError, QuadrantNotFoundError, RadarNotFoundError, RingNotFoundError
from app.models.models import RadarBlip, RadarQuadrant, RadarRing
from app.schemas.blip import BlipPatch, BlipPost
from app.schemas.radar import RadarPost
from sqlalchemy import func, select


def _count(context: AppContext, model: type[RadarBlip]) -> int:
    return context.db.scalar(select(func.count()).select_from(model)) or 0


def _seed_radar(context: AppContext, name: str = "Radar") -> tuple[UUID, list[UUID], list[UUID]]:
    """Create a radar with its default structure and return its placement IDs."""
    radar = RadarService(context).create_radar(RadarPost(name=name))
    quadrants = context.db.scalars(select(RadarQuadrant).where(RadarQuadrant.radar_id == radar.id).order_by(RadarQuadrant.position)).all()
    rings = context.db.scalars(select(RadarRing).where(RadarRing.radar_id == radar.id).order_by(RadarRing.position)).all()
    return radar.id, [quadrant.id for quadrant in quadrants], [ring.id for ring in rings]


def _blip_post(quadrant_id: UUID, ring_id: UUID, name: str = "Blip", description: str = "Text.") -> BlipPost:
    return BlipPost(name=name, description=description, quadrant_id=quadrant_id, ring_id=ring_id)


def test_create_blip_persists_with_placement(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context)

    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0]))

    assert isinstance(blip.id, UUID)
    assert blip.radar_id == radar_id
    assert blip.quadrant_id == quadrants[0]
    assert blip.ring_id == rings[0]
    assert _count(context, RadarBlip) == 1


def test_create_blip_radar_not_found(context: AppContext) -> None:
    _, quadrants, rings = _seed_radar(context)

    with pytest.raises(RadarNotFoundError):
        BlipService(context).create_blip(uuid4(), _blip_post(quadrants[0], rings[0]))


def test_create_blip_quadrant_from_other_radar(context: AppContext) -> None:
    radar_id, _, rings = _seed_radar(context, name="Radar A")
    _, other_quadrants, _ = _seed_radar(context, name="Radar B")

    with pytest.raises(QuadrantNotFoundError):
        BlipService(context).create_blip(radar_id, _blip_post(other_quadrants[0], rings[0]))

    assert _count(context, RadarBlip) == 0


def test_create_blip_ring_from_other_radar(context: AppContext) -> None:
    radar_id, quadrants, _ = _seed_radar(context, name="Radar A")
    _, _, other_rings = _seed_radar(context, name="Radar B")

    with pytest.raises(RingNotFoundError):
        BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], other_rings[0]))

    assert _count(context, RadarBlip) == 0


def test_create_blip_rolls_back_on_db_failure(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context)

    with patch("app.api.services.blip_service.BlipDb") as blip_db_type:
        blip_db_type.return_value.create.side_effect = RuntimeError("create failed")

        with pytest.raises(RuntimeError):
            BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0]))

    context.db.rollback()

    assert _count(context, RadarBlip) == 0


def test_update_blip_not_in_radar(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context, name="Owner")
    other_radar_id, _, _ = _seed_radar(context, name="Other")
    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0]))

    with pytest.raises(BlipNotFoundError):
        BlipService(context).update_blip(other_radar_id, blip.id, BlipPatch(name="Nope"))


def test_update_blip_content_only(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context)
    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0]))

    updated = BlipService(context).update_blip(radar_id, blip.id, BlipPatch(name="Renamed", description="New."))

    assert updated.name == "Renamed"
    assert updated.description == "New."
    assert updated.quadrant_id == quadrants[0]
    assert updated.ring_id == rings[0]


def test_update_blip_placement_only(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context)
    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0], name="Keep"))

    updated = BlipService(context).update_blip(radar_id, blip.id, BlipPatch(quadrant_id=quadrants[1], ring_id=rings[1]))

    assert updated.quadrant_id == quadrants[1]
    assert updated.ring_id == rings[1]
    assert updated.name == "Keep"


def test_update_blip_bumps_updated_at(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context)
    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0]))
    original_updated_at = blip.updated_at

    updated = BlipService(context).update_blip(radar_id, blip.id, BlipPatch(name="Bumped"))

    assert updated.updated_at > original_updated_at


def test_update_blip_invalid_placement_leaves_blip_unchanged(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context, name="Radar A")
    _, other_quadrants, _ = _seed_radar(context, name="Radar B")
    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0], name="Original"))

    with pytest.raises(QuadrantNotFoundError):
        BlipService(context).update_blip(radar_id, blip.id, BlipPatch(name="Changed", quadrant_id=other_quadrants[0]))

    context.db.refresh(blip)
    assert blip.name == "Original"
    assert blip.quadrant_id == quadrants[0]


def test_delete_blip_removes_blip(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context)
    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0]))
    assert _count(context, RadarBlip) == 1

    BlipService(context).delete_blip(radar_id, blip.id)

    assert _count(context, RadarBlip) == 0


def test_delete_blip_not_found(context: AppContext) -> None:
    radar_id, _, _ = _seed_radar(context)

    with pytest.raises(BlipNotFoundError):
        BlipService(context).delete_blip(radar_id, uuid4())


def test_delete_blip_not_in_radar(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context, name="Owner")
    other_radar_id, _, _ = _seed_radar(context, name="Other")
    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0]))

    with pytest.raises(BlipNotFoundError):
        BlipService(context).delete_blip(other_radar_id, blip.id)

    assert _count(context, RadarBlip) == 1  # blip preserved


def test_delete_blip_leaves_other_blips(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context)
    kept = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0], name="Keep"))
    removed = BlipService(context).create_blip(radar_id, _blip_post(quadrants[1], rings[1], name="Remove"))

    BlipService(context).delete_blip(radar_id, removed.id)

    remaining = context.db.scalars(select(RadarBlip)).all()
    assert [blip.id for blip in remaining] == [kept.id]


def test_delete_blip_rolls_back_on_db_failure(context: AppContext) -> None:
    radar_id, quadrants, rings = _seed_radar(context)
    blip = BlipService(context).create_blip(radar_id, _blip_post(quadrants[0], rings[0]))

    with patch("app.api.services.blip_service.BlipDb") as blip_db_type:
        blip_db_type.return_value.get_for_radar.return_value = blip
        blip_db_type.return_value.delete.side_effect = RuntimeError("delete failed")

        with pytest.raises(RuntimeError):
            BlipService(context).delete_blip(radar_id, blip.id)

    context.db.rollback()

    assert _count(context, RadarBlip) == 1
