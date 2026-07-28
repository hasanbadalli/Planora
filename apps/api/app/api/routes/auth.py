from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import AppSettings, CurrentUser, DatabaseSession
from app.core.config import Settings
from app.core.exceptions import (
    AuthenticationError,
    RegistrationConflictError,
    SecurityConfigurationError,
)
from app.schemas.auth import (
    AuthSessionResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.services.auth import login_user, register_user


router = APIRouter(prefix="/auth", tags=["authentication"])


def set_auth_cookie(
    response: Response,
    token: str,
    settings: Settings,
) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )


@router.post(
    "/register",
    response_model=AuthSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    response: Response,
    session: DatabaseSession,
    settings: AppSettings,
) -> AuthSessionResponse:
    try:
        result = await register_user(session, payload, settings)
    except RegistrationConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "REGISTRATION_CONFLICT", "message": str(exc)},
        ) from None
    except SecurityConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AUTH_CONFIGURATION_UNAVAILABLE",
                "message": "Authentication is temporarily unavailable.",
            },
        ) from None

    set_auth_cookie(response, result.access_token, settings)
    return AuthSessionResponse(user=UserResponse.model_validate(result.user))


@router.post("/login", response_model=AuthSessionResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    session: DatabaseSession,
    settings: AppSettings,
) -> AuthSessionResponse:
    try:
        result = await login_user(session, payload, settings)
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Username/email or password is incorrect.",
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

    set_auth_cookie(response, result.access_token, settings)
    return AuthSessionResponse(user=UserResponse.model_validate(result.user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, settings: AppSettings) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        secure=settings.is_production,
        httponly=True,
        samesite="lax",
    )

