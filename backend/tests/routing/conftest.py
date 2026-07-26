from collections.abc import Generator

import pytest
from app.api.api_router import api_router
from app.api.error_handlers import register_exception_handlers
from app.context.app_context import AppContext, get_session_factory
from app.context.settings_context import get_settings
from data.db.base_table import BASE_TABLES
from fastapi import FastAPI
from fastapi.testclient import TestClient
from lib.constants import TEMPLATE_DB_NAME, TEST_DB_NAME
from lib.context import (
    Dependencies,
    cleanup_db,
    create_db,
    create_db_from,
    get_template_settings,
    get_test_context,
    kill_connections,
    run_migrations,
)
from lib.database_helper import DatabaseHelper
from lib.schemas import MockTables


@pytest.fixture(scope="session", autouse=True)
def prepare_template_db() -> Generator[None]:
    """One-time setup for the test session.

    - Connects to the PostgreSQL 'postgres' DB using bootstrap settings
    - Drops and recreates the template DB (e.g., 'report_craft_test_template')
    - Runs Alembic migrations on the template DB to create a clean schema

    This DB is later cloned to create a fresh test DB for each individual test.
    """
    cleanup_db(TEMPLATE_DB_NAME)
    create_db(TEMPLATE_DB_NAME)

    run_migrations(get_template_settings().db_url)

    yield

    cleanup_db(TEMPLATE_DB_NAME)


@pytest.fixture(autouse=True)
def setup_module(context: AppContext) -> Generator[None]:
    """Initialize base tables for all tests by default."""
    db_helper = DatabaseHelper(context)
    db_helper.load_data(BASE_TABLES)
    yield
    db_helper.cleanup_tables(BASE_TABLES)


@pytest.fixture(autouse=True)
def setup_test_data(request: pytest.FixtureRequest, context: AppContext) -> Generator[None]:
    """Load test-specific data if TEST_DATA is defined in the module.

    Define TEST_DATA as a MockTables instance in your test module to have
    additional data loaded before each test and cleaned up after.

    Example:
        TEST_DATA = MockTables({
            "user": MockData(
                table_name="user",
                data=[User(id="...", username="testuser", ...)],
                id_field="id",
            ),
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


def init_client(dependencies: Dependencies) -> TestClient:
    """Initialize test client."""
    app = FastAPI(title="TEST API")
    register_exception_handlers(app)
    app.include_router(api_router, prefix="/api")

    app.dependency_overrides[get_settings] = dependencies.settings_factory

    return TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db() -> Generator[None]:
    """Drop and recreates the test DB from the template before each module.

    Cleans up the test DB after the module completes.
    """
    cleanup_db(TEST_DB_NAME)
    kill_connections(TEMPLATE_DB_NAME)
    create_db_from(TEST_DB_NAME, TEMPLATE_DB_NAME)
    yield
    cleanup_db(TEST_DB_NAME)


@pytest.fixture(scope="module")
def context(setup_test_db: None, dependencies: Dependencies) -> Generator[AppContext]:
    """Override root context to depend on setup_test_db.

    This enforces teardown order:
    context is disposed before setup_test_db drops the database.
    """
    ctx = get_test_context(dependencies)
    yield ctx
    ctx.dispose()
    get_session_factory.cache_clear()


@pytest.fixture
def client(dependencies: Dependencies) -> TestClient:
    """Set up a FastAPI TestClient for a single test."""
    return init_client(dependencies)
