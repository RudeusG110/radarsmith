from app.api.services.radar_service import RadarService
from app.context.app_context import AppContext
from app.domain.enums import QuadrantType, RingType
from app.schemas.radar import RadarOut, RadarPost


def test_create_radar_builds_default_structure(context: AppContext) -> None:
    service = RadarService(context)

    radar = service.create_radar(RadarPost(name="My Radar", purpose="Testing"))

    assert radar.name == "My Radar"
    assert radar.purpose == "Testing"
    assert [quadrant.position for quadrant in radar.quadrants] == [1, 2, 3, 4]
    assert [ring.position for ring in radar.rings] == [1, 2, 3, 4]


def test_create_radar_serializes_to_radar_out(context: AppContext) -> None:
    service = RadarService(context)

    radar = service.create_radar(RadarPost(name="My Radar"))
    out = RadarOut.model_validate(radar)

    assert out.name == "My Radar"
    assert out.purpose is None
    assert len(out.quadrants) == 4
    assert len(out.rings) == 4
    assert out.quadrants[0].name == QuadrantType.TECHNIQUES
    assert out.rings[0].name == RingType.ADOPT
