from typing import Literal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class DuplicateUserError(Exception):
    """Raised when a user insert violates a unique identity constraint."""


async def get_user_by_id(
    session: AsyncSession,
    user_id: UUID,
) -> User | None:
    statement = select(User).where(
        User.id == user_id,
        User.deleted_at.is_(None),
        User.is_active.is_(True),
    )
    return await session.scalar(statement)


async def get_user_by_identifier(
    session: AsyncSession,
    identifier: str,
) -> User | None:
    normalized = identifier.lower()
    statement = select(User).where(
        User.deleted_at.is_(None),
        or_(
            func.lower(User.username) == normalized,
            func.lower(User.email) == normalized,
        ),
    )
    return await session.scalar(statement)


async def find_registration_conflict(
    session: AsyncSession,
    username: str,
    email: str,
) -> Literal["username", "email"] | None:
    statement = select(User.username, User.email).where(
        User.deleted_at.is_(None),
        or_(
            func.lower(User.username) == username.lower(),
            func.lower(User.email) == email.lower(),
        ),
    )
    result = (await session.execute(statement)).first()
    if result is None:
        return None
    if result.username.lower() == username.lower():
        return "username"
    return "email"


async def add_user(session: AsyncSession, user: User) -> User:
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise DuplicateUserError from exc
    return user

