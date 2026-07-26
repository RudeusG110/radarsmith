from app.domain.enums import QuadrantType
from pydantic import BaseModel, Field


class QuadrantPost(BaseModel):
    name: QuadrantType = Field(max_length=100)
    position: int = Field(ge=1, le=4)
