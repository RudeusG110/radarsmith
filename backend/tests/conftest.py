import pytest
from lib.context import Dependencies, get_test_settings


@pytest.fixture(scope="module")
def dependencies() -> Dependencies:
    """Return default dependencies for tests."""
    return Dependencies(settings_factory=get_test_settings)
