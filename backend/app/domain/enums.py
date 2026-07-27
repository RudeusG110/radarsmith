from enum import StrEnum


class QuadrantType(StrEnum):
    TECHNIQUES = "TECHNIQUES"
    TOOLS = "TOOLS"
    PLATFORMS = "PLATFORMS"
    LANGUAGES_AND_FRAMEWORKS = "LANGUAGES & FRAMEWORKS"


class RingType(StrEnum):
    ADOPT = "ADOPT"
    TRIAL = "TRIAL"
    ASSESS = "ASSESS"
    CAUTION = "CAUTION"
