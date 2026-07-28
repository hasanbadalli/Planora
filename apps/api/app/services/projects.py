from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceConflictError, ResourceNotFoundError
from app.models.project import FuturePlan, Project, ProjectNote
from app.repositories import projects as project_repository
from app.schemas.projects import (
    FuturePlanCreate,
    FuturePlanUpdate,
    ProjectCreate,
    ProjectNoteCreate,
    ProjectNoteUpdate,
    ProjectUpdate,
)


DEFAULT_PROJECTS: tuple[tuple[str, str, str], ...] = (
    ("Self Improvement", "Build habits and make steady personal progress.", "#4F7665"),
    ("Reading", "Keep books, reading sessions, and ideas together.", "#B7794B"),
    ("Personal Tasks", "Keep everyday responsibilities organized and visible.", "#5B6F91"),
    ("Learning", "Plan courses, practice sessions, and new skills.", "#7765A8"),
    ("Health & Fitness", "Create a sustainable rhythm for movement and wellbeing.", "#B65F68"),
)


async def create_default_projects(session: AsyncSession, user_id: UUID) -> None:
    for position, (name, description, color) in enumerate(DEFAULT_PROJECTS):
        session.add(
            Project(
                user_id=user_id,
                name=name,
                description=description,
                color=color,
                position=position,
            )
        )
    await session.flush()


async def get_projects(session: AsyncSession, user_id: UUID) -> list[Project]:
    return await project_repository.list_projects(session, user_id)


async def get_owned_project(session: AsyncSession, user_id: UUID, project_id: UUID) -> Project:
    project = await project_repository.get_project(session, user_id, project_id)
    if project is None:
        raise ResourceNotFoundError("Project was not found.")
    return project


async def validate_owned_projects(
    session: AsyncSession, user_id: UUID, project_ids: list[UUID]
) -> None:
    projects = await project_repository.get_projects_by_ids(
        session, user_id, project_ids
    )
    if {project.id for project in projects} != set(project_ids):
        raise ResourceNotFoundError("One or more projects were not found.")


async def create_project(
    session: AsyncSession, user_id: UUID, payload: ProjectCreate
) -> Project:
    project = Project(
        user_id=user_id,
        position=await project_repository.next_project_position(session, user_id),
        **payload.model_dump(),
    )
    try:
        await project_repository.add_project(session, project)
        await session.commit()
    except project_repository.DuplicateProjectError as exc:
        raise ResourceConflictError("A project with this name already exists.") from exc
    return project


async def update_project(
    session: AsyncSession, user_id: UUID, project_id: UUID, payload: ProjectUpdate
) -> Project:
    project = await get_owned_project(session, user_id, project_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ResourceConflictError("A project with this name already exists.") from exc
    await session.refresh(project)
    return project


async def delete_project(
    session: AsyncSession, user_id: UUID, project_id: UUID
) -> None:
    project = await get_owned_project(session, user_id, project_id)
    await project_repository.soft_delete_project(session, user_id, project)
    await session.commit()


async def get_future_plans(
    session: AsyncSession, user_id: UUID, project_id: UUID
) -> list[FuturePlan]:
    await get_owned_project(session, user_id, project_id)
    return await project_repository.list_future_plans(session, user_id, project_id)


async def create_future_plan(
    session: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    payload: FuturePlanCreate,
) -> FuturePlan:
    await get_owned_project(session, user_id, project_id)
    plan = FuturePlan(
        user_id=user_id,
        project_id=project_id,
        position=await project_repository.next_future_plan_position(session, user_id, project_id),
        **payload.model_dump(),
    )
    await project_repository.add_future_plan(session, plan)
    await session.commit()
    return plan


async def update_future_plan(
    session: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    plan_id: UUID,
    payload: FuturePlanUpdate,
) -> FuturePlan:
    await get_owned_project(session, user_id, project_id)
    plan = await project_repository.get_future_plan(session, user_id, project_id, plan_id)
    if plan is None:
        raise ResourceNotFoundError("Future plan was not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    await session.commit()
    await session.refresh(plan)
    return plan


async def get_project_notes(
    session: AsyncSession, user_id: UUID, project_id: UUID
) -> list[ProjectNote]:
    await get_owned_project(session, user_id, project_id)
    return await project_repository.list_project_notes(session, user_id, project_id)


async def get_project_note(
    session: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    note_id: UUID,
) -> ProjectNote:
    await get_owned_project(session, user_id, project_id)
    note = await project_repository.get_project_note(
        session, user_id, project_id, note_id
    )
    if note is None:
        raise ResourceNotFoundError("Project note was not found.")
    return note


async def create_project_note(
    session: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    payload: ProjectNoteCreate,
) -> ProjectNote:
    await get_owned_project(session, user_id, project_id)
    note = ProjectNote(
        user_id=user_id,
        project_id=project_id,
        position=await project_repository.next_project_note_position(
            session, user_id, project_id
        ),
        **payload.model_dump(),
    )
    await project_repository.add_project_note(session, note)
    await session.commit()
    return note


async def update_project_note(
    session: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    note_id: UUID,
    payload: ProjectNoteUpdate,
) -> ProjectNote:
    note = await get_project_note(session, user_id, project_id, note_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    await session.commit()
    await session.refresh(note)
    return note


async def delete_project_note(
    session: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    note_id: UUID,
) -> None:
    note = await get_project_note(session, user_id, project_id, note_id)
    await project_repository.soft_delete_project_note(
        note, datetime.now(timezone.utc)
    )
    await session.commit()
