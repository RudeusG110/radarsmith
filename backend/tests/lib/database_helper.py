from copy import deepcopy

from app.context.app_context import AppContext
from lib.schemas import MockTables
from sqlalchemy import text


class DatabaseHelper:
    def __init__(self, ctx: AppContext) -> None:
        self.__ctx = ctx

    def load_data(self, data: MockTables) -> None:
        actual_data = deepcopy(data)

        db = self.__ctx.db

        for mock_data in actual_data.values():
            db.add_all(mock_data.data)

        db.commit()

    def cleanup_tables(self, data: MockTables) -> None:
        tables = data.keys()

        db = self.__ctx.db

        for table in tables:
            db.execute(text(f"TRUNCATE TABLE public.{table} RESTART IDENTITY CASCADE"))

        db.flush()
        db.commit()
