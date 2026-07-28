from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainValidationError, ResourceNotFoundError
from app.models.task import (
    RecurrenceRule,
    Task,
    TaskCategoryLink,
    TaskOccurrence,
    TaskProject,
)
from app.repositories import tasks as task_repository
from app.schemas.tasks import TaskCreate, TaskOccurrenceUpdate, TaskResponse, TaskUpdate
from app.services.projects import get_owned_project, validate_owned_projects


MAX_CALENDAR_RANGE_DAYS = 62
OCCURRENCE_MOVE_PADDING_DAYS = 7


async def create_task(
    session: AsyncSession,
    user_id: UUID,
    user_timezone: str,
    payload: TaskCreate,
) -> TaskResponse:
    await validate_owned_projects(session, user_id, payload.project_ids)

    rule: RecurrenceRule | None = None
    local_start = payload.starts_at.astimezone(ZoneInfo(user_timezone))
    if payload.weekly_repeat:
        rule = RecurrenceRule(
            user_id=user_id,
            frequency="weekly",
            interval=1,
            by_weekdays=[local_start.weekday()],
            starts_on=local_start.date(),
            timezone=user_timezone,
        )
        await task_repository.add_recurrence_rule(session, rule)

    task = Task(
        user_id=user_id,
        title=payload.title,
        description=payload.description,
        difficulty=payload.difficulty,
        estimated_minutes=payload.estimated_minutes,
        status=payload.status,
        completed_at=datetime.now(timezone.utc) if payload.status == "done" else None,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        recurrence_rule_id=rule.id if rule else None,
        project_links=[
            TaskProject(project_id=project_id, position=position)
            for position, project_id in enumerate(payload.project_ids)
        ],
        category_links=[
            TaskCategoryLink(category=category.value, position=position)
            for position, category in enumerate(payload.categories)
        ],
    )
    await task_repository.add_task(session, task)
    await session.commit()
    return _serialize_occurrence(
        task,
        rule,
        task.starts_at,
        task.ends_at,
        user_timezone,
        local_start.date(),
    )


async def get_task(
    session: AsyncSession, user_id: UUID, user_timezone: str, task_id: UUID
) -> TaskResponse:
    task = await _get_owned_task(session, user_id, task_id)
    rule = await _get_rule(session, user_id, task)
    series_date = task.starts_at.astimezone(ZoneInfo(user_timezone)).date()
    return _serialize_occurrence(
        task, rule, task.starts_at, task.ends_at, user_timezone, series_date
    )


async def update_task(
    session: AsyncSession,
    user_id: UUID,
    user_timezone: str,
    task_id: UUID,
    payload: TaskUpdate,
) -> TaskResponse:
    task = await _get_owned_task(session, user_id, task_id, for_update=True)
    changes = payload.model_dump(exclude_unset=True)
    if "project_ids" in changes and payload.project_ids is not None:
        await validate_owned_projects(session, user_id, payload.project_ids)

    starts_at = payload.starts_at if "starts_at" in changes else task.starts_at
    ends_at = payload.ends_at if "ends_at" in changes else task.ends_at
    _validate_task_times(starts_at, ends_at)

    rule = await _get_rule(session, user_id, task)
    weekly_repeat = payload.weekly_repeat if "weekly_repeat" in changes else rule is not None
    local_start = starts_at.astimezone(ZoneInfo(user_timezone))
    if weekly_repeat and rule is None:
        rule = RecurrenceRule(
            user_id=user_id,
            frequency="weekly",
            interval=1,
            by_weekdays=[local_start.weekday()],
            starts_on=local_start.date(),
            timezone=user_timezone,
        )
        await task_repository.add_recurrence_rule(session, rule)
        task.recurrence_rule_id = rule.id
    elif weekly_repeat and rule is not None:
        rule.by_weekdays = [local_start.weekday()]
        rule.starts_on = local_start.date()
        rule.timezone = user_timezone
    elif not weekly_repeat and rule is not None:
        task.recurrence_rule_id = None
        await session.delete(rule)
        rule = None

    for field in (
        "title",
        "description",
        "difficulty",
        "estimated_minutes",
        "starts_at",
        "ends_at",
    ):
        if field in changes:
            setattr(task, field, changes[field])
    if "project_ids" in changes and payload.project_ids is not None:
        await _replace_project_links(session, task, payload.project_ids)
    if "categories" in changes and payload.categories is not None:
        await _replace_category_links(
            session,
            task,
            [category.value for category in payload.categories],
        )
    if "status" in changes and payload.status is not None:
        _set_task_status(task, payload.status)

    await session.commit()
    await session.refresh(task)
    series_date = task.starts_at.astimezone(ZoneInfo(user_timezone)).date()
    return _serialize_occurrence(
        task, rule, task.starts_at, task.ends_at, user_timezone, series_date
    )


async def update_task_occurrence(
    session: AsyncSession,
    user_id: UUID,
    user_timezone: str,
    task_id: UUID,
    occurrence_date: date,
    payload: TaskOccurrenceUpdate,
) -> TaskResponse:
    task = await _get_owned_task(session, user_id, task_id, for_update=True)
    rule = await _get_rule(session, user_id, task)
    if rule is None:
        raise DomainValidationError("This task is not recurring.")
    if not _is_rule_occurrence_date(rule, occurrence_date):
        raise ResourceNotFoundError("Task occurrence was not found.")

    if payload.scope == "future":
        return await _split_future_series(
            session,
            task,
            rule,
            occurrence_date,
            payload,
            user_timezone,
        )

    starts_at, ends_at = _original_occurrence_times(task, rule, occurrence_date)
    occurrence = await task_repository.get_occurrence_override(
        session, user_id, task.id, occurrence_date
    )
    if occurrence is None:
        occurrence = TaskOccurrence(
            user_id=user_id,
            task_id=task.id,
            occurrence_date=occurrence_date,
        )
        await task_repository.add_occurrence_override(session, occurrence)

    if payload.starts_at is not None and payload.ends_at is not None:
        _validate_task_times(payload.starts_at, payload.ends_at)
        occurrence.starts_at_override = payload.starts_at
        occurrence.ends_at_override = payload.ends_at
    if payload.status is not None:
        occurrence.status_override = payload.status
        occurrence.is_completed = payload.status == "done"
        occurrence.completed_at = (
            datetime.now(timezone.utc) if payload.status == "done" else None
        )

    await session.commit()
    await session.refresh(occurrence)
    item = _apply_override(
        task,
        rule,
        starts_at,
        ends_at,
        user_timezone,
        occurrence_date,
        occurrence,
    )
    if item is None:
        raise ResourceNotFoundError("Task occurrence was not found.")
    return item


async def list_tasks(
    session: AsyncSession,
    user_id: UUID,
    user_timezone: str,
    from_at: datetime,
    to_at: datetime,
    project_id: UUID | None = None,
) -> list[TaskResponse]:
    _validate_calendar_range(from_at, to_at)
    if project_id is not None:
        await get_owned_project(session, user_id, project_id)

    bases = await task_repository.list_task_bases(
        session, user_id, from_at, to_at, project_id
    )
    zone = ZoneInfo(user_timezone)
    from_date = from_at.astimezone(zone).date()
    to_date = (to_at.astimezone(zone) - timedelta(microseconds=1)).date()
    override_from = from_date - timedelta(days=OCCURRENCE_MOVE_PADDING_DAYS)
    override_to = to_date + timedelta(days=OCCURRENCE_MOVE_PADDING_DAYS)
    overrides = await task_repository.list_occurrence_overrides(
        session,
        user_id,
        [task.id for task, _ in bases],
        override_from,
        override_to,
    )
    items: list[TaskResponse] = []
    for task, rule in bases:
        if rule is None:
            series_date = task.starts_at.astimezone(zone).date()
            item = _apply_override(
                task,
                rule,
                task.starts_at,
                task.ends_at,
                user_timezone,
                series_date,
                overrides.get((task.id, series_date)),
            )
            if item is not None and item.ends_at > from_at and item.starts_at < to_at:
                items.append(item)
            continue

        padded_from = from_at - timedelta(days=OCCURRENCE_MOVE_PADDING_DAYS)
        padded_to = to_at + timedelta(days=OCCURRENCE_MOVE_PADDING_DAYS)
        for starts_at, ends_at in _weekly_occurrences(
            task, rule, padded_from, padded_to
        ):
            series_date = starts_at.astimezone(zone).date()
            item = _apply_override(
                task,
                rule,
                starts_at,
                ends_at,
                user_timezone,
                series_date,
                overrides.get((task.id, series_date)),
            )
            if item is not None and item.ends_at > from_at and item.starts_at < to_at:
                items.append(item)
    return sorted(items, key=lambda item: (item.starts_at, item.title.lower()))


async def _split_future_series(
    session: AsyncSession,
    task: Task,
    rule: RecurrenceRule,
    occurrence_date: date,
    payload: TaskOccurrenceUpdate,
    user_timezone: str,
) -> TaskResponse:
    if payload.starts_at is None or payload.ends_at is None:
        raise DomainValidationError("Future recurrence changes require a time range.")
    _validate_task_times(payload.starts_at, payload.ends_at)
    zone = ZoneInfo(user_timezone)
    new_local_start = payload.starts_at.astimezone(zone)

    if occurrence_date == rule.starts_on:
        task.starts_at = payload.starts_at
        task.ends_at = payload.ends_at
        rule.starts_on = new_local_start.date()
        rule.by_weekdays = [new_local_start.weekday()]
        rule.timezone = user_timezone
        if payload.status is not None:
            _set_task_status(task, payload.status)
        await session.commit()
        await session.refresh(task)
        return _serialize_occurrence(
            task,
            rule,
            task.starts_at,
            task.ends_at,
            user_timezone,
            rule.starts_on,
        )

    original_end = rule.ends_on
    rule.ends_on = occurrence_date - timedelta(days=1)
    new_rule = RecurrenceRule(
        user_id=task.user_id,
        frequency=rule.frequency,
        interval=rule.interval,
        by_weekdays=[new_local_start.weekday()],
        starts_on=new_local_start.date(),
        ends_on=original_end,
        timezone=user_timezone,
    )
    await task_repository.add_recurrence_rule(session, new_rule)
    new_status = payload.status or task.status
    new_task = Task(
        user_id=task.user_id,
        parent_task_id=task.parent_task_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        status=new_status,
        priority=task.priority,
        difficulty=task.difficulty,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        due_at=task.due_at,
        is_all_day=task.is_all_day,
        estimated_minutes=task.estimated_minutes,
        completed_at=datetime.now(timezone.utc) if new_status == "done" else None,
        recurrence_rule_id=new_rule.id,
        position=task.position,
        project_links=[
            TaskProject(project_id=link.project_id, position=link.position)
            for link in task.project_links
        ],
        category_links=[
            TaskCategoryLink(category=link.category, position=link.position)
            for link in task.category_links
        ],
    )
    await task_repository.add_task(session, new_task)
    await session.commit()
    return _serialize_occurrence(
        new_task,
        new_rule,
        new_task.starts_at,
        new_task.ends_at,
        user_timezone,
        new_local_start.date(),
    )


async def _get_owned_task(
    session: AsyncSession,
    user_id: UUID,
    task_id: UUID,
    *,
    for_update: bool = False,
) -> Task:
    task = (
        await task_repository.get_task_for_update(session, user_id, task_id)
        if for_update
        else await task_repository.get_task(session, user_id, task_id)
    )
    if task is None:
        raise ResourceNotFoundError("Task was not found.")
    return task


async def _get_rule(
    session: AsyncSession, user_id: UUID, task: Task
) -> RecurrenceRule | None:
    return (
        await task_repository.get_recurrence_rule(
            session, user_id, task.recurrence_rule_id
        )
        if task.recurrence_rule_id
        else None
    )


def _set_task_status(task: Task, status: str) -> None:
    task.status = status
    task.completed_at = datetime.now(timezone.utc) if status == "done" else None


async def _replace_project_links(
    session: AsyncSession, task: Task, project_ids: list[UUID]
) -> None:
    for position, link in enumerate(task.project_links, start=1):
        link.position = -position
    await session.flush()

    existing = {link.project_id: link for link in task.project_links}
    task.project_links[:] = [
        existing.get(project_id)
        or TaskProject(project_id=project_id, position=position)
        for position, project_id in enumerate(project_ids)
    ]
    for position, link in enumerate(task.project_links):
        link.position = position


async def _replace_category_links(
    session: AsyncSession, task: Task, categories: list[str]
) -> None:
    for position, link in enumerate(task.category_links, start=1):
        link.position = -position
    await session.flush()

    existing = {link.category: link for link in task.category_links}
    task.category_links[:] = [
        existing.get(category)
        or TaskCategoryLink(category=category, position=position)
        for position, category in enumerate(categories)
    ]
    for position, link in enumerate(task.category_links):
        link.position = position


def _validate_task_times(starts_at: datetime, ends_at: datetime) -> None:
    if starts_at.utcoffset() is None or ends_at.utcoffset() is None:
        raise DomainValidationError("Task times must include timezone offsets.")
    if ends_at <= starts_at:
        raise DomainValidationError("End time must be after start time.")
    if ends_at - starts_at > timedelta(days=7):
        raise DomainValidationError("A task cannot be longer than seven days.")


def _validate_calendar_range(from_at: datetime, to_at: datetime) -> None:
    if from_at.utcoffset() is None or to_at.utcoffset() is None:
        raise DomainValidationError("Calendar range must include timezone offsets.")
    if to_at <= from_at:
        raise DomainValidationError("Calendar range end must be after its start.")
    if to_at - from_at > timedelta(days=MAX_CALENDAR_RANGE_DAYS):
        raise DomainValidationError(
            f"Calendar range cannot exceed {MAX_CALENDAR_RANGE_DAYS} days."
        )


def _weekly_occurrences(
    task: Task, rule: RecurrenceRule, from_at: datetime, to_at: datetime
) -> list[tuple[datetime, datetime]]:
    zone = ZoneInfo(rule.timezone)
    local_base = task.starts_at.astimezone(zone)
    duration = task.ends_at - task.starts_at
    search_date = max(
        rule.starts_on, from_at.astimezone(zone).date() - timedelta(days=1)
    )
    last_date = (to_at.astimezone(zone) + timedelta(days=1)).date()
    weekdays = set(rule.by_weekdays)
    occurrences: list[tuple[datetime, datetime]] = []
    current = search_date
    while current <= last_date:
        weeks_since_start = (current - rule.starts_on).days // 7
        if (
            _is_rule_occurrence_date(rule, current)
            and weeks_since_start % rule.interval == 0
        ):
            local_start = datetime.combine(
                current,
                time(local_base.hour, local_base.minute, local_base.second),
                zone,
            )
            start = local_start.astimezone(timezone.utc)
            end = start + duration
            if end > from_at and start < to_at:
                occurrences.append((start, end))
        current += timedelta(days=1)
    return occurrences


def _is_rule_occurrence_date(rule: RecurrenceRule, candidate: date) -> bool:
    if candidate < rule.starts_on:
        return False
    if rule.ends_on is not None and candidate > rule.ends_on:
        return False
    if candidate.weekday() not in set(rule.by_weekdays):
        return False
    return ((candidate - rule.starts_on).days // 7) % rule.interval == 0


def _original_occurrence_times(
    task: Task, rule: RecurrenceRule, occurrence_date: date
) -> tuple[datetime, datetime]:
    zone = ZoneInfo(rule.timezone)
    local_base = task.starts_at.astimezone(zone)
    local_start = datetime.combine(
        occurrence_date,
        time(local_base.hour, local_base.minute, local_base.second),
        zone,
    )
    starts_at = local_start.astimezone(timezone.utc)
    return starts_at, starts_at + (task.ends_at - task.starts_at)


def _apply_override(
    task: Task,
    rule: RecurrenceRule | None,
    starts_at: datetime,
    ends_at: datetime,
    user_timezone: str,
    series_date: date,
    override: TaskOccurrence | None,
) -> TaskResponse | None:
    if override and override.is_skipped:
        return None
    item = _serialize_occurrence(
        task,
        rule,
        override.starts_at_override
        if override and override.starts_at_override
        else starts_at,
        override.ends_at_override if override and override.ends_at_override else ends_at,
        user_timezone,
        series_date,
    )
    if override:
        item.title = override.title_override or item.title
        item.status = override.status_override or (
            "done" if override.is_completed else item.status
        )
        item.completed_at = override.completed_at if item.status == "done" else None
    return item


def _serialize_occurrence(
    task: Task,
    rule: RecurrenceRule | None,
    starts_at: datetime,
    ends_at: datetime,
    user_timezone: str,
    series_date: date,
) -> TaskResponse:
    project_ids = [link.project_id for link in task.project_links]
    categories = [link.category for link in task.category_links] or ["other"]
    return TaskResponse(
        id=task.id,
        project_ids=project_ids,
        categories=categories,
        project_id=project_ids[0] if project_ids else None,
        title=task.title,
        description=task.description,
        category=categories[0],
        difficulty=task.difficulty,
        estimated_minutes=task.estimated_minutes,
        status=task.status,
        starts_at=starts_at,
        ends_at=ends_at,
        weekly_repeat=rule is not None,
        occurrence_date=starts_at.astimezone(ZoneInfo(user_timezone)).date(),
        series_date=series_date,
        completed_at=task.completed_at if task.status == "done" else None,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )
