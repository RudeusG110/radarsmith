from collections.abc import Generator
from contextlib import contextmanager
from dataclasses import dataclass, field

from sqlalchemy import Engine, event


@dataclass
class QueryCounter:
    """Collect the SQL statements executed while active."""

    statements: list[str] = field(default_factory=list)

    @property
    def count(self) -> int:
        return len(self.statements)


@contextmanager
def count_queries(engine: Engine) -> Generator[QueryCounter]:
    """Count SQL statements executed on ``engine`` within the block.

    Use this to guard against N+1 query regressions: assert that the statement
    count stays bounded regardless of how many child rows exist.
    """
    counter = QueryCounter()

    def _on_execute(_conn: object, _cursor: object, statement: str, *_args: object) -> None:
        counter.statements.append(statement)

    event.listen(engine, "before_cursor_execute", _on_execute)
    try:
        yield counter
    finally:
        event.remove(engine, "before_cursor_execute", _on_execute)
