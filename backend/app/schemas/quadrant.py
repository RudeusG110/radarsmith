from uuid import UUID

from app.domain.enums import QuadrantType
from pydantic import BaseModel, ConfigDict, Field


class QuadrantPost(BaseModel):
    name: QuadrantType
    position: int = Field(ge=1, le=4)


class QuadrantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: QuadrantType
    position: int
