from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.context.app_context import AppContext
from app.domain.preload.loader import load_starter_radar
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


def _count(db_url: str, statement: str, radar_id: UUID) -> int:
    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            return conn.execute(text(statement), {"id": radar_id}).scalar_one()
    finally:
        engine.dispose()


def _radar_name(db_url: str, radar_id: UUID) -> str:
    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            return conn.execute(text("SELECT name FROM radar WHERE id = :id"), {"id": radar_id}).scalar_one()
    finally:
        engine.dispose()


def _update_radar_name(db_url: str, radar_id: UUID, name: str) -> None:
    engine = create_engine(db_url)
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE radar SET name = :name WHERE id = :id"), {"name": name, "id": radar_id})
    finally:
        engine.dispose()


def _delete_radar(db_url: str, radar_id: UUID) -> None:
    engine = create_engine(db_url)
    try:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM radar WHERE id = :id"), {"id": radar_id})
    finally:
        engine.dispose()


def _preload_counts(db_url: str, radar_id: UUID) -> tuple[int, int, int, int]:
    return (
        _count(db_url, "SELECT count(*) FROM radar WHERE id = :id", radar_id),
        _count(db_url, "SELECT count(*) FROM radar_quadrant WHERE radar_id = :id", radar_id),
        _count(db_url, "SELECT count(*) FROM radar_ring WHERE radar_id = :id", radar_id),
        _count(db_url, "SELECT count(*) FROM radar_blip WHERE radar_id = :id", radar_id),
    )


def test_preload_migration_inserts_complete_starter_radar(empty_database: str) -> None:
    run_migrations(empty_database)

    artifact = load_starter_radar()
    radar_id = UUID(artifact["radar"]["id"])

    radar_count, quadrant_count, ring_count, blip_count = _preload_counts(empty_database, radar_id)
    name = _radar_name(empty_database, radar_id)

    assert radar_count == 1
    assert name == artifact["radar"]["name"]
    assert quadrant_count == len(artifact["quadrants"])
    assert ring_count == len(artifact["rings"])
    assert blip_count == len(artifact["blips"])


def test_preload_migration_does_not_duplicate_on_rerun(empty_database: str) -> None:
    run_migrations(empty_database)
    run_migrations(empty_database)

    artifact = load_starter_radar()
    radar_id = UUID(artifact["radar"]["id"])

    radar_count, _, _, blip_count = _preload_counts(empty_database, radar_id)

    assert radar_count == 1
    assert blip_count == len(artifact["blips"])


def test_preload_edit_survives_migration_rerun(empty_database: str) -> None:
    run_migrations(empty_database)

    artifact = load_starter_radar()
    radar_id = UUID(artifact["radar"]["id"])
    _update_radar_name(empty_database, radar_id, "Edited Radar")

    run_migrations(empty_database)

    assert _radar_name(empty_database, radar_id) == "Edited Radar"


def test_preload_deletion_does_not_reappear_on_migration_rerun(empty_database: str) -> None:
    run_migrations(empty_database)

    artifact = load_starter_radar()
    radar_id = UUID(artifact["radar"]["id"])
    _delete_radar(empty_database, radar_id)

    run_migrations(empty_database)

    radar_count, quadrant_count, ring_count, blip_count = _preload_counts(empty_database, radar_id)

    assert radar_count == 0
    assert quadrant_count == 0
    assert ring_count == 0
    assert blip_count == 0


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
