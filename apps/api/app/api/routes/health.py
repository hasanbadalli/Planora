import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from app.core.config import get_settings
from app.schemas.health import ApplicationHealthResponse, DatabaseHealthResponse
from app.services.health import check_database_connection


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("", response_model=ApplicationHealthResponse)
async def application_health() -> ApplicationHealthResponse:
    settings = get_settings()
    return ApplicationHealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.environment,
        timestamp=utc_now(),
    )


@router.get("/database", response_model=DatabaseHealthResponse)
async def database_health() -> DatabaseHealthResponse:
    try:
        await check_database_connection()
    except Exception as exc:
        logger.error(
            "Database health check failed; error_type=%s", type(exc).__name__
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_UNAVAILABLE",
                "message": "Database connection is unavailable.",
            },
        ) from None

    return DatabaseHealthResponse(
        status="ok",
        database="connected",
        timestamp=utc_now(),
    )
