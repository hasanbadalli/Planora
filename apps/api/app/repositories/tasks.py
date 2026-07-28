from datetime import date, datetime
from uuid import UUID

from sqlalchemy import exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import RecurrenceRule, Task, TaskOccurrence, TaskProject


async def get_task(session: AsyncSession, user_id: UUID, task_id: UUID) -> Task | None:
    return await session.scalar(
        select(Task).where(Task.id == task_id, Task.user_id == user_id, Task.deleted_at.is_(None))
    )


async def get_task_for_update(
    session: AsyncSession, user_id: UUID, task_id: UUID
) -> Task | None:
    return await session.scalar(
        select(Task)
        .where(Task.id == task_id, Task.user_id == user_id, Task.deleted_at.is_(None))
        .with_for_update()
    )


async def get_recurrence_rule(
    session: AsyncSession, user_id: UUID, rule_id: UUID
) -> RecurrenceRule | None:
    return await session.scalar(
        select(RecurrenceRule).where(RecurrenceRule.id == rule_id, RecurrenceRule.user_id == user_id)
    )


async def add_task(session: AsyncSession, task: Task) -> Task:
    session.add(task)
    await session.flush()
    return task


async def add_recurrence_rule(session: AsyncSession, rule: RecurrenceRule) -> RecurrenceRule:
    session.add(rule)
    await session.flush()
    return rule


async def get_occurrence_override(
    session: AsyncSession,
    user_id: UUID,
    task_id: UUID,
    occurrence_date: date,
) -> TaskOccurrence | None:
    return await session.scalar(
        select(TaskOccurrence).where(
            TaskOccurrence.user_id == user_id,
            TaskOccurrence.task_id == task_id,
            TaskOccurrence.occurrence_date == occurrence_date,
        )
    )


async def add_occurrence_override(
    session: AsyncSession, occurrence: TaskOccurrence
) -> TaskOccurrence:
    session.add(occurrence)
    await session.flush()
    return occurrence


async def list_task_bases(
    session: AsyncSession,
    user_id: UUID,
    from_at: datetime,
    to_at: datetime,
    project_id: UUID | None = None,
) -> list[tuple[Task, RecurrenceRule | None]]:
    query = (
        select(Task, RecurrenceRule)
        .outerjoin(RecurrenceRule, Task.recurrence_rule_id == RecurrenceRule.id)
        .where(
            Task.user_id == user_id,
            Task.deleted_at.is_(None),
            Task.starts_at < to_at,
            or_(
                Task.recurrence_rule_id.is_not(None),
                Task.ends_at > from_at,
            ),
        )
        .order_by(Task.starts_at, Task.created_at)
    )
    if project_id is not None:
        query = query.where(
            exists().where(
                TaskProject.task_id == Task.id,
                TaskProject.project_id == project_id,
            )
        )
    rows = await session.execute(query)
    return [(task, rule) for task, rule in rows.all()]


async def list_occurrence_overrides(
    session: AsyncSession,
    user_id: UUID,
    task_ids: list[UUID],
    from_date: date,
    to_date: date,
) -> dict[tuple[UUID, date], TaskOccurrence]:
    if not task_ids:
        return {}
    result = await session.scalars(
        select(TaskOccurrence).where(
            TaskOccurrence.user_id == user_id,
            TaskOccurrence.task_id.in_(task_ids),
            TaskOccurrence.occurrence_date >= from_date,
            TaskOccurrence.occurrence_date <= to_date,
        )
    )
    return {(item.task_id, item.occurrence_date): item for item in result}
