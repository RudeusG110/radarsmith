from data.db.radar import RADARS
from lib.schemas import MockData, MockTables

BASE_TABLES = MockTables({"radar": MockData(data=RADARS)})
