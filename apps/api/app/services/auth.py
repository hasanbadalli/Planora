from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import AuthenticationError, RegistrationConflictError
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
    verify_password_against_dummy,
)
from app.models.user import User
from app.repositories.users import (
    DuplicateUserError,
    add_user,
    find_registration_conflict,
    get_user_by_id,
    get_user_by_identifier,
)
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.projects import create_default_projects


@dataclass(frozen=True, slots=True)
class AuthResult:
    user: User
    access_token: str


async def register_user(
    session: AsyncSession,
    payload: RegisterRequest,
    settings: Settings,
) -> AuthResult:
    normalized_email = str(payload.email).lower()
    conflict = await find_registration_conflict(
        session, payload.username, normalized_email
    )
    if conflict is not None:
        raise RegistrationConflictError(
            "Username is already in use."
            if conflict == "username"
            else "Email is already in use."
        )

    user = User(
        username=payload.username,
        email=normalized_email,
        password_hash=hash_password(payload.password),
        timezone=payload.timezone,
    )
    try:
        await add_user(session, user)
        await create_default_projects(session, user.id)
        access_token = create_access_token(
            user.id,
            settings.jwt_secret_key,
            settings.access_token_expire_minutes,
        )
        await session.commit()
    except DuplicateUserError as exc:
        raise RegistrationConflictError(
            "Username or email is already in use."
        ) from exc
    except Exception:
        await session.rollback()
        raise

    return AuthResult(
        user=user,
        access_token=access_token,
    )


async def login_user(
    session: AsyncSession,
    payload: LoginRequest,
    settings: Settings,
) -> AuthResult:
    user = await get_user_by_identifier(session, payload.identifier)
    if user is None:
        verify_password_against_dummy(payload.password)
        raise AuthenticationError("Username/email or password is incorrect.")

    if not user.is_active or not verify_password(
        payload.password, user.password_hash
    ):
        raise AuthenticationError("Username/email or password is incorrect.")

    return AuthResult(
        user=user,
        access_token=create_access_token(
            user.id,
            settings.jwt_secret_key,
            settings.access_token_expire_minutes,
        ),
    )


async def get_authenticated_user(
    session: AsyncSession,
    token: str,
    settings: Settings,
) -> User:
    user_id: UUID = decode_access_token(token, settings.jwt_secret_key)
    user = await get_user_by_id(session, user_id)
    if user is None:
        raise AuthenticationError("User session is no longer valid.")
    return user
