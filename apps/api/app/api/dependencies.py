from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_database_session
from app.core.exceptions import AuthenticationError, SecurityConfigurationError
from app.models.user import User
from app.services.auth import get_authenticated_user


DatabaseSession = Annotated[AsyncSession, Depends(get_database_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]


async def get_current_user(
    request: Request,
    session: DatabaseSession,
    settings: AppSettings,
) -> User:
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHENTICATED",
                "message": "Authentication is required.",
            },
        )

    try:
        return await get_authenticated_user(session, token, settings)
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHENTICATED",
                "message": "Authentication is required.",
            },
        ) from None
    except SecurityConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AUTH_CONFIGURATION_UNAVAILABLE",
                "message": "Authentication is temporarily unavailable.",
            },
        ) from None


CurrentUser = Annotated[User, Depends(get_current_user)]

