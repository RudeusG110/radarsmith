from collections.abc import Generator, Sequence

from app.database.database import Base
from pydantic import BaseModel, ConfigDict, RootModel


class MockData(BaseModel):
    data: Sequence[Base]

    model_config = ConfigDict(arbitrary_types_allowed=True)


class MockTables(RootModel[dict[str, MockData]]):
    def __getitem__(self, key: str) -> MockData:
        return self.root[key]

    def __setitem__(self, key: str, value: MockData) -> None:
        self.root[key] = value

    def __delitem__(self, key: str) -> None:
        del self.root[key]

    def __iter__(self) -> Generator[tuple[str, MockData]]:
        yield from self.root.items()

    def __len__(self) -> int:
        return len(self.root)

    def __contains__(self, key: str) -> bool:
        return key in self.root

    def keys(self) -> Generator[str]:
        yield from self.root.keys()

    def values(self) -> Generator[MockData]:
        yield from self.root.values()

    def items(self) -> Generator[tuple[str, MockData]]:
        yield from self.root.items()

    def get(self, key: str, default: MockData | None = None) -> MockData | None:
        return self.root.get(key, default)
