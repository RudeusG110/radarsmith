class DomainError(Exception):
    """Base class for domain-level errors raised by the authoring workers."""


class NotFoundError(DomainError):
    """Base class for errors raised when a requested resource cannot be found."""


class ConflictError(DomainError):
    """Raised when a request conflicts with the current state of a resource."""

    def __init__(self, message: str) -> None:
        super().__init__(message)


class RadarNotFoundError(NotFoundError):
    """Raised when a radar cannot be found by its identifier."""

    def __init__(self, radar_id: str) -> None:
        self.radar_id = radar_id
        super().__init__(f"Radar with ID {radar_id} not found.")


class BlipNotFoundError(NotFoundError):
    """Raised when a blip cannot be found within the requested radar."""

    def __init__(self, blip_id: str) -> None:
        self.blip_id = blip_id
        super().__init__(f"Blip with ID {blip_id} not found.")


class QuadrantNotFoundError(NotFoundError):
    """Raised when a quadrant cannot be found within the requested radar."""

    def __init__(self, quadrant_id: str) -> None:
        self.quadrant_id = quadrant_id
        super().__init__(f"Quadrant with ID {quadrant_id} not found.")


class RingNotFoundError(NotFoundError):
    """Raised when a ring cannot be found within the requested radar."""

    def __init__(self, ring_id: str) -> None:
        self.ring_id = ring_id
        super().__init__(f"Ring with ID {ring_id} not found.")
