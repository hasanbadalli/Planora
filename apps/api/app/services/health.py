from sqlalchemy import text

from app.core.database import get_async_engine


async def check_database_connection() -> None:
    """Raise when a minimal database round-trip cannot be completed."""
    async with get_async_engine().connect() as connection:
        await connection.execute(text("SELECT 1"))

