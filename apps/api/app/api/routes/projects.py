from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.exceptions import ResourceConflictError, ResourceNotFoundError
from app.schemas.projects import (
    FuturePlanCreate,
    FuturePlanListResponse,
    FuturePlanResponse,
    FuturePlanUpdate,
    ProjectCreate,
    ProjectListResponse,
    ProjectNoteCreate,
    ProjectNoteListResponse,
    ProjectNoteResponse,
    ProjectNoteUpdate,
    ProjectResponse,
    ProjectUpdate,
)
from app.services import projects as project_service


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
async def list_projects(session: DatabaseSession, user: CurrentUser) -> ProjectListResponse:
    return ProjectListResponse(items=await project_service.get_projects(session, user.id))


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate, session: DatabaseSession, user: CurrentUser
) -> ProjectResponse:
    try:
        project = await project_service.create_project(session, user.id, payload)
    except ResourceConflictError as exc:
        raise _http_error(status.HTTP_409_CONFLICT, "PROJECT_NAME_CONFLICT", str(exc)) from None
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID, session: DatabaseSession, user: CurrentUser
) -> ProjectResponse:
    try:
        project = await project_service.get_owned_project(session, user.id, project_id)
    except ResourceNotFoundError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)) from None
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    session: DatabaseSession,
    user: CurrentUser,
) -> ProjectResponse:
    try:
        project = await project_service.update_project(session, user.id, project_id, payload)
    except ResourceNotFoundError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)) from None
    except ResourceConflictError as exc:
        raise _http_error(status.HTTP_409_CONFLICT, "PROJECT_NAME_CONFLICT", str(exc)) from None
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID, session: DatabaseSession, user: CurrentUser
) -> None:
    try:
        await project_service.delete_project(session, user.id, project_id)
    except ResourceNotFoundError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)) from None


@router.get("/{project_id}/future-plans", response_model=FuturePlanListResponse)
async def list_future_plans(
    project_id: UUID, session: DatabaseSession, user: CurrentUser
) -> FuturePlanListResponse:
    try:
        items = await project_service.get_future_plans(session, user.id, project_id)
    except ResourceNotFoundError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)) from None
    return FuturePlanListResponse(items=items)


@router.post(
    "/{project_id}/future-plans",
    response_model=FuturePlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_future_plan(
    project_id: UUID,
    payload: FuturePlanCreate,
    session: DatabaseSession,
    user: CurrentUser,
) -> FuturePlanResponse:
    try:
        plan = await project_service.create_future_plan(session, user.id, project_id, payload)
    except ResourceNotFoundError as exc:
        raise _http_error(status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)) from None
    return FuturePlanResponse.model_validate(plan)


@router.patch("/{project_id}/future-plans/{plan_id}", response_model=FuturePlanResponse)
async def update_future_plan(
    project_id: UUID,
    plan_id: UUID,
    payload: FuturePlanUpdate,
    session: DatabaseSession,
    user: CurrentUser,
) -> FuturePlanResponse:
    try:
        plan = await project_service.update_future_plan(
            session, user.id, project_id, plan_id, payload
        )
    except ResourceNotFoundError as exc:
        code = "FUTURE_PLAN_NOT_FOUND" if "Future" in str(exc) else "PROJECT_NOT_FOUND"
        raise _http_error(status.HTTP_404_NOT_FOUND, code, str(exc)) from None
    return FuturePlanResponse.model_validate(plan)


@router.get("/{project_id}/notes", response_model=ProjectNoteListResponse)
async def list_project_notes(
    project_id: UUID, session: DatabaseSession, user: CurrentUser
) -> ProjectNoteListResponse:
    try:
        items = await project_service.get_project_notes(session, user.id, project_id)
    except ResourceNotFoundError as exc:
        raise _http_error(
            status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)
        ) from None
    return ProjectNoteListResponse(items=items)


@router.post(
    "/{project_id}/notes",
    response_model=ProjectNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project_note(
    project_id: UUID,
    payload: ProjectNoteCreate,
    session: DatabaseSession,
    user: CurrentUser,
) -> ProjectNoteResponse:
    try:
        note = await project_service.create_project_note(
            session, user.id, project_id, payload
        )
    except ResourceNotFoundError as exc:
        raise _http_error(
            status.HTTP_404_NOT_FOUND, "PROJECT_NOT_FOUND", str(exc)
        ) from None
    return ProjectNoteResponse.model_validate(note)


@router.get(
    "/{project_id}/notes/{note_id}", response_model=ProjectNoteResponse
)
async def get_project_note(
    project_id: UUID,
    note_id: UUID,
    session: DatabaseSession,
    user: CurrentUser,
) -> ProjectNoteResponse:
    try:
        note = await project_service.get_project_note(
            session, user.id, project_id, note_id
        )
    except ResourceNotFoundError as exc:
        code = "PROJECT_NOTE_NOT_FOUND" if "note" in str(exc).lower() else "PROJECT_NOT_FOUND"
        raise _http_error(status.HTTP_404_NOT_FOUND, code, str(exc)) from None
    return ProjectNoteResponse.model_validate(note)


@router.patch(
    "/{project_id}/notes/{note_id}", response_model=ProjectNoteResponse
)
async def update_project_note(
    project_id: UUID,
    note_id: UUID,
    payload: ProjectNoteUpdate,
    session: DatabaseSession,
    user: CurrentUser,
) -> ProjectNoteResponse:
    try:
        note = await project_service.update_project_note(
            session, user.id, project_id, note_id, payload
        )
    except ResourceNotFoundError as exc:
        code = "PROJECT_NOTE_NOT_FOUND" if "note" in str(exc).lower() else "PROJECT_NOT_FOUND"
        raise _http_error(status.HTTP_404_NOT_FOUND, code, str(exc)) from None
    return ProjectNoteResponse.model_validate(note)


@router.delete(
    "/{project_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_project_note(
    project_id: UUID,
    note_id: UUID,
    session: DatabaseSession,
    user: CurrentUser,
) -> None:
    try:
        await project_service.delete_project_note(
            session, user.id, project_id, note_id
        )
    except ResourceNotFoundError as exc:
        code = "PROJECT_NOTE_NOT_FOUND" if "note" in str(exc).lower() else "PROJECT_NOT_FOUND"
        raise _http_error(status.HTTP_404_NOT_FOUND, code, str(exc)) from None


def _http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})
