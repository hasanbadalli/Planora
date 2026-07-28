from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.exceptions import DomainValidationError, ResourceNotFoundError
from app.schemas.tasks import (
    TaskCreate,
    TaskListResponse,
    TaskOccurrenceUpdate,
    TaskResponse,
    TaskUpdate,
)
from app.services import tasks as task_service


router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    session: DatabaseSession,
    user: CurrentUser,
    from_at: datetime = Query(),
    to_at: datetime = Query(),
    project_id: UUID | None = Query(default=None),
) -> TaskListResponse:
    try:
        items = await task_service.list_tasks(
            session, user.id, user.timezone, from_at, to_at, project_id
        )
    except ResourceNotFoundError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)) from None
    except DomainValidationError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_CALENDAR_RANGE", str(exc)) from None
    return TaskListResponse(items=items)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate, session: DatabaseSession, user: CurrentUser
) -> TaskResponse:
    try:
        return await task_service.create_task(session, user.id, user.timezone, payload)
    except ResourceNotFoundError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)) from None


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID, session: DatabaseSession, user: CurrentUser
) -> TaskResponse:
    try:
        return await task_service.get_task(session, user.id, user.timezone, task_id)
    except ResourceNotFoundError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, "TASK_NOT_FOUND", str(exc)) from None


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    session: DatabaseSession,
    user: CurrentUser,
) -> TaskResponse:
    try:
        return await task_service.update_task(
            session, user.id, user.timezone, task_id, payload
        )
    except ResourceNotFoundError as exc:
        code = "PROJECT_NOT_FOUND" if "Project" in str(exc) else "TASK_NOT_FOUND"
        raise _http_error(status.HTTP_404_NOT_FOUND, code, str(exc)) from None
    except DomainValidationError as exc:
        raise _http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_TASK_TIME", str(exc)) from None


@router.patch("/{task_id}/occurrences/{occurrence_date}", response_model=TaskResponse)
async def update_task_occurrence(
    task_id: UUID,
    occurrence_date: date,
    payload: TaskOccurrenceUpdate,
    session: DatabaseSession,
    user: CurrentUser,
) -> TaskResponse:
    try:
        return await task_service.update_task_occurrence(
            session,
            user.id,
            user.timezone,
            task_id,
            occurrence_date,
            payload,
        )
    except ResourceNotFoundError as exc:
        raise _http_error(
            status.HTTP_404_NOT_FOUND, "TASK_OCCURRENCE_NOT_FOUND", str(exc)
        ) from None
    except DomainValidationError as exc:
        raise _http_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "INVALID_OCCURRENCE_UPDATE",
            str(exc),
        ) from None


def _http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})
