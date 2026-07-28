from uuid import UUID

from datetime import datetime, timezone

from sqlalchemy import Select, delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import FuturePlan, Project, ProjectNote
from app.models.task import TaskProject


class DuplicateProjectError(Exception):
    """Raised when an active project name is already used by the owner."""


def _owned_projects(user_id: UUID) -> Select[tuple[Project]]:
    return select(Project).where(Project.user_id == user_id, Project.deleted_at.is_(None))


async def list_projects(session: AsyncSession, user_id: UUID) -> list[Project]:
    result = await session.scalars(_owned_projects(user_id).order_by(Project.position, Project.created_at))
    return list(result)


async def get_project(session: AsyncSession, user_id: UUID, project_id: UUID) -> Project | None:
    return await session.scalar(_owned_projects(user_id).where(Project.id == project_id))


async def get_projects_by_ids(
    session: AsyncSession, user_id: UUID, project_ids: list[UUID]
) -> list[Project]:
    if not project_ids:
        return []
    result = await session.scalars(
        _owned_projects(user_id).where(Project.id.in_(project_ids))
    )
    return list(result)


async def add_project(session: AsyncSession, project: Project) -> Project:
    session.add(project)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise DuplicateProjectError from exc
    return project


async def next_project_position(session: AsyncSession, user_id: UUID) -> int:
    value = await session.scalar(
        select(func.coalesce(func.max(Project.position), -1)).where(
            Project.user_id == user_id, Project.deleted_at.is_(None)
        )
    )
    return int(value or 0) + 1


async def list_future_plans(
    session: AsyncSession, user_id: UUID, project_id: UUID
) -> list[FuturePlan]:
    result = await session.scalars(
        select(FuturePlan)
        .where(
            FuturePlan.user_id == user_id,
            FuturePlan.project_id == project_id,
            FuturePlan.deleted_at.is_(None),
        )
        .order_by(FuturePlan.position, FuturePlan.target_date.asc().nulls_last(), FuturePlan.created_at)
    )
    return list(result)


async def get_future_plan(
    session: AsyncSession, user_id: UUID, project_id: UUID, plan_id: UUID
) -> FuturePlan | None:
    return await session.scalar(
        select(FuturePlan).where(
            FuturePlan.id == plan_id,
            FuturePlan.user_id == user_id,
            FuturePlan.project_id == project_id,
            FuturePlan.deleted_at.is_(None),
        )
    )


async def add_future_plan(session: AsyncSession, plan: FuturePlan) -> FuturePlan:
    session.add(plan)
    await session.flush()
    return plan


async def next_future_plan_position(
    session: AsyncSession, user_id: UUID, project_id: UUID
) -> int:
    value = await session.scalar(
        select(func.coalesce(func.max(FuturePlan.position), -1)).where(
            FuturePlan.user_id == user_id,
            FuturePlan.project_id == project_id,
            FuturePlan.deleted_at.is_(None),
        )
    )
    return int(value or 0) + 1


async def list_project_notes(
    session: AsyncSession, user_id: UUID, project_id: UUID
) -> list[ProjectNote]:
    result = await session.scalars(
        select(ProjectNote)
        .where(
            ProjectNote.user_id == user_id,
            ProjectNote.project_id == project_id,
            ProjectNote.deleted_at.is_(None),
        )
        .order_by(ProjectNote.position, ProjectNote.updated_at.desc())
    )
    return list(result)


async def get_project_note(
    session: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    note_id: UUID,
) -> ProjectNote | None:
    return await session.scalar(
        select(ProjectNote).where(
            ProjectNote.id == note_id,
            ProjectNote.user_id == user_id,
            ProjectNote.project_id == project_id,
            ProjectNote.deleted_at.is_(None),
        )
    )


async def add_project_note(
    session: AsyncSession, note: ProjectNote
) -> ProjectNote:
    session.add(note)
    await session.flush()
    return note


async def next_project_note_position(
    session: AsyncSession, user_id: UUID, project_id: UUID
) -> int:
    value = await session.scalar(
        select(func.coalesce(func.max(ProjectNote.position), -1)).where(
            ProjectNote.user_id == user_id,
            ProjectNote.project_id == project_id,
            ProjectNote.deleted_at.is_(None),
        )
    )
    return int(value or 0) + 1


async def soft_delete_project_note(
    note: ProjectNote, deleted_at: datetime
) -> None:
    note.deleted_at = deleted_at


async def soft_delete_project(
    session: AsyncSession, user_id: UUID, project: Project
) -> None:
    deleted_at = datetime.now(timezone.utc)
    await session.execute(
        delete(TaskProject).where(TaskProject.project_id == project.id)
    )
    await session.execute(
        update(FuturePlan)
        .where(
            FuturePlan.user_id == user_id,
            FuturePlan.project_id == project.id,
            FuturePlan.deleted_at.is_(None),
        )
        .values(deleted_at=deleted_at)
    )
    await session.execute(
        update(ProjectNote)
        .where(
            ProjectNote.user_id == user_id,
            ProjectNote.project_id == project.id,
            ProjectNote.deleted_at.is_(None),
        )
        .values(deleted_at=deleted_at)
    )
    project.deleted_at = deleted_at
