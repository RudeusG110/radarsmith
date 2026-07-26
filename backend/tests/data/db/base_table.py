from data.db.radar import RADARS
from lib.schemas import MockData, MockTables

BASE_TABLES = MockTables({"radar": MockData(table_name="radar", data=RADARS, id_field="id", reset_id=False)})
