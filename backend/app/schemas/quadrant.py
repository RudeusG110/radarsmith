from app.domain.enums import QuadrantType
from pydantic import BaseModel, ConfigDict, Field


class QuadrantPost(BaseModel):
    name: QuadrantType = Field(max_length=100)
    position: int = Field(ge=1, le=4)


class QuadrantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: QuadrantType
    position: int
