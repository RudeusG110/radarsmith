from collections.abc import Generator

import pytest
from app.context.app_context import AppContext
from lib.context import Dependencies, get_test_context, get_test_settings


@pytest.fixture(scope="module")
def dependencies() -> Dependencies:
    """Return default dependencies for tests."""
    return Dependencies(settings_factory=get_test_settings)


@pytest.fixture(scope="module")
def context(dependencies: Dependencies) -> Generator[AppContext]:
    """Return a test context using the provided dependencies."""
    context = get_test_context(dependencies)
    yield context
    context.dispose()
