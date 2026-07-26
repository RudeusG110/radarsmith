from app.domain.enums import RingType
from app.schemas.quadrant import QuadrantPost, QuadrantType
from app.schemas.ring import RingPost

DEFAULT_QUADRANTS = [
    QuadrantPost(name=QuadrantType.TECHNIQUES, position=1),
    QuadrantPost(name=QuadrantType.TOOLS, position=2),
    QuadrantPost(name=QuadrantType.PLATFORMS, position=3),
    QuadrantPost(name=QuadrantType.LANGUAGES_AND_FRAMEWORKS, position=4),
]

DEFAULT_RINGS = [
    RingPost(name=RingType.ADOPT, position=1),
    RingPost(name=RingType.TRIAL, position=2),
    RingPost(name=RingType.ASSESS, position=3),
    RingPost(name=RingType.CAUTION, position=4),
]
