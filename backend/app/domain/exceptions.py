class DomainError(Exception):
    """Base class for domain-level errors raised by the authoring services."""


class RadarNotFoundError(DomainError):
    """Raised when a radar cannot be found by its identifier."""

    def __init__(self, radar_id: str) -> None:
        self.radar_id = radar_id
        super().__init__(f"Radar with ID {radar_id} not found.")
