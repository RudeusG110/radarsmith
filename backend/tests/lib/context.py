from collections.abc import Callable
from functools import lru_cache

from alembic import command
from alembic.config import Config
from app.context.app_context import AppContext, get_session_factory
from app.context.settings_context import AppSettings
from psycopg import connect, sql
from sqlalchemy import Engine, create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.util import immutabledict

_TERMINATE_STATEMENT = """
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = %s
            AND pid <> pg_backend_pid();
            """


def get_test_settings() -> AppSettings:
    return AppSettings("backend/tests/config/test.env")


def get_bootstrap_settings() -> AppSettings:
    return AppSettings("backend/tests/config/bootstrap.env")


def get_template_settings() -> AppSettings:
    return AppSettings("backend/tests/config/template.env")


def kill_connections(db_name: str) -> None:
    settings = get_bootstrap_settings()
    with connect(settings.db_url, autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute(_TERMINATE_STATEMENT, (db_name,))


def create_db(db_name: str) -> None:
    settings = get_bootstrap_settings()
    with connect(settings.db_url, autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))


def create_db_from(db_name: str, db_template: str) -> None:
    settings = get_bootstrap_settings()
    with connect(settings.db_url, autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql.SQL("CREATE DATABASE {} TEMPLATE {}").format(sql.Identifier(db_name), sql.Identifier(db_template)))


def cleanup_db(db_name: str) -> None:
    kill_connections(db_name)
    settings = get_bootstrap_settings()
    with connect(settings.db_url, autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(db_name)))


def _make_alembic_config(db_url: str) -> Config:
    config_args = immutabledict({"db_url": db_url})
    alembic_cfg = Config(config_args=config_args, file_="backend/alembic/alembic.ini")
    alembic_cfg.set_main_option("script_location", "backend/alembic")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    return alembic_cfg


def run_migrations(db_url: str) -> None:
    command.upgrade(_make_alembic_config(db_url), "head")


def downgrade_migrations(db_url: str, revision: str = "base") -> None:
    command.downgrade(_make_alembic_config(db_url), revision)


class Dependencies:
    def __init__(self, settings_factory: Callable[[], AppSettings] | None = None) -> None:
        if settings_factory is None:
            settings_factory = get_test_settings
        self.settings_factory = settings_factory


@lru_cache
def get_test_engine(db_url: str) -> Engine:
    """Return a NullPool engine for the given database URL.

    NullPool keeps no connections open between checkouts, so a test database can
    be dropped and recreated without leaving stale pooled connections behind.
    """
    return create_engine(db_url, poolclass=NullPool)


def get_test_context(dependencies: Dependencies | None) -> AppContext:
    if dependencies is None:
        dependencies = Dependencies()

    settings = dependencies.settings_factory()
    session_local = get_session_factory(settings.db_url)

    database = session_local()
    return AppContext(database, settings)
