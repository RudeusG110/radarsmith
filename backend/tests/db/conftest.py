from collections.abc import Generator

import pytest
from app.context.app_context import AppContext
from lib.constants import TEMPLATE_DB_NAME, TEST_DB_NAME
from lib.context import (
    Dependencies,
    cleanup_db,
    create_db,
    create_db_from,
    get_template_settings,
    get_test_engine,
    kill_connections,
    run_migrations,
)
from lib.database_helper import DatabaseHelper
from lib.schemas import MockTables
from sqlalchemy.orm import Session


@pytest.fixture(scope="session", autouse=True)
def prepare_template_db() -> Generator[None]:
    """One-time setup for the test session.

    - Connects to the PostgreSQL 'postgres' DB using bootstrap settings
    - Drops and recreates the template DB (e.g., 'radarsmith_test_template')
    - Runs Alembic migrations on the template DB to create a clean schema

    This DB is later cloned to create a fresh test DB for each individual test.
    """
    cleanup_db(TEMPLATE_DB_NAME)
    create_db(TEMPLATE_DB_NAME)

    run_migrations(get_template_settings().db_url)

    yield

    cleanup_db(TEMPLATE_DB_NAME)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db() -> Generator[None]:
    """Drop and recreate the test DB from the template before each module.

    Cleans up the test DB after the module completes.
    """
    cleanup_db(TEST_DB_NAME)
    kill_connections(TEMPLATE_DB_NAME)
    create_db_from(TEST_DB_NAME, TEMPLATE_DB_NAME)
    yield
    cleanup_db(TEST_DB_NAME)


@pytest.fixture
def context(setup_test_db: None, dependencies: Dependencies) -> Generator[AppContext]:
    """Provide an AppContext whose writes are isolated to a single test.

    The session joins an outer transaction with ``join_transaction_mode="create_savepoint"``,
    so every ``commit()`` only releases a SAVEPOINT. Rolling the outer transaction back on
    teardown discards everything the test wrote, so each test starts from the freshly
    migrated schema with no cross-test bleed.
    """
    settings = dependencies.settings_factory()
    connection = get_test_engine(settings.db_url).connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint", autoflush=False)

    yield AppContext(session, settings)

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(autouse=True)
def setup_test_data(request: pytest.FixtureRequest, context: AppContext) -> Generator[None]:
    """Load test-specific data if TEST_DATA is defined in the module.

    Define TEST_DATA as a MockTables instance in your test module to have
    additional data loaded before each test and cleaned up after.

    Example:
        TEST_DATA = MockTables({
            "radar": MockData(data=[Radar(id="...", name="Example radar")]),
        })

    """
    module = getattr(request, "module", None)

    if module is None:
        yield
        return

    test_data = getattr(module, "TEST_DATA", None)
    if test_data is None:
        yield
        return

    if not isinstance(test_data, MockTables):
        raise ValueError("TEST_DATA must be an instance of MockTables")

    db_helper = DatabaseHelper(context)
    db_helper.load_data(test_data)
    yield
    db_helper.cleanup_tables(test_data)
