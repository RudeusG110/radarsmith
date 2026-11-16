from typing import Annotated
from uuid import UUID

from fastapi import Path

RadarId = Annotated[UUID, Path()]
BlipId = Annotated[UUID, Path()]
