from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.context.settings_context import AppSettings, get_settings
from app.log.logging import get_logger

logger = get_logger()


class AppContext:
    db: Session
    settings: AppSettings

    def __init__(self, db: Session, settings: AppSettings) -> None:
        self.db = db
        self.settings = settings

    def dispose(self) -> None:
        self.db.close()

    def now_utc(self) -> datetime:  # noqa: PLR6301
        return datetime.now(UTC)


@lru_cache(maxsize=1)
def get_session_factory(url: str) -> sessionmaker[Session]:
    """Create and return a SQLAlchemy session factory."""
    engine = create_engine(url)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def build_app_context(settings: AppSettings) -> Generator[AppContext]:
    """Build and dispose a standalone AppContext instance."""
    session_local = get_session_factory(settings.db_url)
    database = session_local()
    context = AppContext(database, settings)

    try:
        yield context
    finally:
        context.dispose()


def get_app_context(settings: Annotated[AppSettings, Depends(get_settings)]) -> Generator[AppContext]:
    """Dependency to provide an application context with database session and settings."""
    with build_app_context(settings) as context:
        yield context
