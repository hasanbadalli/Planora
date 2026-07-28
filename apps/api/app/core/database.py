from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


def normalize_database_url(database_url: str) -> str:
    """Adapt a Neon URL for SQLAlchemy's psycopg async dialect."""
    if database_url.startswith("postgresql://"):
        return database_url.replace(
            "postgresql://", "postgresql+psycopg://", 1
        )
    return database_url


@lru_cache
def get_async_engine() -> AsyncEngine:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not configured.")

    return create_async_engine(
        normalize_database_url(settings.database_url),
        pool_pre_ping=True,
    )


@lru_cache
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=get_async_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_database_session() -> AsyncIterator[AsyncSession]:
    """Yield one request-scoped async database session."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session

