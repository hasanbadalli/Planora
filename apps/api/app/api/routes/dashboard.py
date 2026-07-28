from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.exceptions import ResourceNotFoundError
from app.schemas.dashboard import DashboardRange, DashboardResponse
from app.schemas.tasks import TaskCategory
from app.services import dashboard as dashboard_service


router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    session: DatabaseSession,
    user: CurrentUser,
    dashboard_range: DashboardRange = Query(
        default=DashboardRange.WEEK, alias="range"
    ),
    category: TaskCategory | None = Query(default=None),
) -> DashboardResponse:
    return await dashboard_service.get_dashboard(
        session,
        user.id,
        user.timezone,
        dashboard_range,
        category,
    )


@router.get(
    "/projects/{project_id}/statistics", response_model=DashboardResponse
)
async def get_project_statistics(
    project_id: UUID,
    session: DatabaseSession,
    user: CurrentUser,
    dashboard_range: DashboardRange = Query(
        default=DashboardRange.WEEK, alias="range"
    ),
    category: TaskCategory | None = Query(default=None),
) -> DashboardResponse:
    try:
        return await dashboard_service.get_dashboard(
            session,
            user.id,
            user.timezone,
            dashboard_range,
            category,
            project_id,
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": str(exc)},
        ) from None
