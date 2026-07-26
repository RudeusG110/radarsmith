from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.context.app_context import AppContext
from app.models.models import Radar, RadarBlip, RadarQuadrant, RadarRing
from lib.context import cleanup_db, create_db, downgrade_migrations, get_template_settings, run_migrations
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError

EXPECTED_TABLES = {"radar", "radar_quadrant", "radar_ring", "radar_blip"}

LIFECYCLE_DB_NAME = "radarsmith_migration_lifecycle_test"
LIFECYCLE_DB_URL = make_url(get_template_settings().db_url).set(database=LIFECYCLE_DB_NAME).render_as_string(hide_password=False)


def _table_names(db_url: str) -> set[str]:
    engine = create_engine(db_url)
    try:
        return set(inspect(engine).get_table_names())
    finally:
        engine.dispose()


def _add_radar(context: AppContext) -> Radar:
    radar = Radar(name="Test Radar")
    context.db.add(radar)
    context.db.flush()
    return radar


def _count_for_radar(context: AppContext, model: type[RadarQuadrant] | type[RadarRing] | type[RadarBlip], radar_id: UUID) -> int:
    count = context.db.scalar(select(func.count()).select_from(model).where(model.radar_id == radar_id))
    return count or 0


@pytest.fixture
def empty_database() -> Generator[str]:
    """Provide a brand-new, unmigrated PostgreSQL database and drop it afterward."""
    cleanup_db(LIFECYCLE_DB_NAME)
    create_db(LIFECYCLE_DB_NAME)
    yield LIFECYCLE_DB_URL
    cleanup_db(LIFECYCLE_DB_NAME)


def test_upgrade_creates_complete_schema_on_empty_database(empty_database: str) -> None:
    assert EXPECTED_TABLES.isdisjoint(_table_names(empty_database))

    run_migrations(empty_database)

    assert EXPECTED_TABLES.issubset(_table_names(empty_database))


def test_downgrade_removes_schema(empty_database: str) -> None:
    run_migrations(empty_database)

    downgrade_migrations(empty_database)

    assert EXPECTED_TABLES.isdisjoint(_table_names(empty_database))


def test_quadrant_position_unique_per_radar(context: AppContext) -> None:
    radar = _add_radar(context)
    context.db.add(RadarQuadrant(radar_id=radar.id, name="Tools", position=0))
    context.db.add(RadarQuadrant(radar_id=radar.id, name="Techniques", position=0))

    with pytest.raises(IntegrityError):
        context.db.commit()

    context.db.rollback()


def test_ring_position_unique_per_radar(context: AppContext) -> None:
    radar = _add_radar(context)
    context.db.add(RadarRing(radar_id=radar.id, name="Adopt", position=0))
    context.db.add(RadarRing(radar_id=radar.id, name="Trial", position=0))

    with pytest.raises(IntegrityError):
        context.db.commit()

    context.db.rollback()


def test_foreign_key_rejects_orphan_quadrant(context: AppContext) -> None:
    context.db.add(RadarQuadrant(radar_id=uuid4(), name="Tools", position=0))

    with pytest.raises(IntegrityError):
        context.db.commit()

    context.db.rollback()


_INSERT_BLIP_WITHOUT_NAME = (
    "INSERT INTO radar_blip (id, radar_id, quadrant_id, ring_id, description) VALUES (:id, :radar_id, :quadrant_id, :ring_id, :value)"
)
_INSERT_BLIP_WITHOUT_DESCRIPTION = (
    "INSERT INTO radar_blip (id, radar_id, quadrant_id, ring_id, name) VALUES (:id, :radar_id, :quadrant_id, :ring_id, :value)"
)


@pytest.mark.parametrize(
    "insert_sql", [_INSERT_BLIP_WITHOUT_NAME, _INSERT_BLIP_WITHOUT_DESCRIPTION], ids=["missing_name", "missing_description"]
)
def test_blip_requires_name_and_description(context: AppContext, insert_sql: str) -> None:
    radar = _add_radar(context)
    quadrant = RadarQuadrant(radar_id=radar.id, name="Tools", position=0)
    ring = RadarRing(radar_id=radar.id, name="Adopt", position=0)
    context.db.add_all([quadrant, ring])
    context.db.flush()

    with pytest.raises(IntegrityError):
        context.db.execute(
            text(insert_sql), {"id": uuid4(), "radar_id": radar.id, "quadrant_id": quadrant.id, "ring_id": ring.id, "value": "x"}
        )

    context.db.rollback()


def test_deleting_radar_cascades_to_children(context: AppContext) -> None:
    radar = _add_radar(context)
    radar_id = radar.id
    quadrant = RadarQuadrant(radar_id=radar_id, name="Tools", position=0)
    ring = RadarRing(radar_id=radar_id, name="Adopt", position=0)
    context.db.add_all([quadrant, ring])
    context.db.flush()
    context.db.add(RadarBlip(radar_id=radar_id, quadrant_id=quadrant.id, ring_id=ring.id, name="Blip", description="Desc"))
    context.db.commit()

    context.db.execute(text("DELETE FROM radar WHERE id = :id"), {"id": radar_id})
    context.db.commit()

    assert _count_for_radar(context, RadarQuadrant, radar_id) == 0
    assert _count_for_radar(context, RadarRing, radar_id) == 0
    assert _count_for_radar(context, RadarBlip, radar_id) == 0
