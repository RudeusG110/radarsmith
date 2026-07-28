from uuid import UUID

from app.domain.enums import RingType
from pydantic import BaseModel, ConfigDict, Field


class RingPost(BaseModel):
    name: RingType
    position: int = Field(ge=1, le=4)


class RingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: RingType
    position: int
