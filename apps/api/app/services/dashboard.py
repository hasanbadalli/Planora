from __future__ import annotations

from calendar import month_abbr, monthrange
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from math import ceil
from typing import Literal, cast
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.schemas.dashboard import (
    CategoryBreakdownItem,
    DashboardPeriod,
    DashboardRange,
    DashboardResponse,
    DashboardScope,
    DashboardSeriesPoint,
    DashboardSummary,
    DashboardTrend,
    DashboardTrends,
    ProjectProgressItem,
    StatusDistributionItem,
)
from app.schemas.tasks import TaskCategory, TaskResponse
from app.services import tasks as task_service
from app.services.projects import get_owned_project, get_projects


@dataclass(frozen=True, slots=True)
class _PeriodWindow:
    starts_at: datetime
    ends_at: datetime
    previous_starts_at: datetime
    previous_ends_at: datetime
    bucket: Literal["day", "month"]


async def get_dashboard(
    session: AsyncSession,
    user_id: UUID,
    user_timezone: str,
    dashboard_range: DashboardRange,
    category: TaskCategory | None = None,
    project_id: UUID | None = None,
    *,
    now: datetime | None = None,
) -> DashboardResponse:
    project: Project | None = None
    if project_id is not None:
        project = await get_owned_project(session, user_id, project_id)

    projects = await get_projects(session, user_id)
    period = _resolve_period(
        dashboard_range,
        user_timezone,
        now or datetime.now(timezone.utc),
    )
    current_tasks = await _list_tasks_in_chunks(
        session,
        user_id,
        user_timezone,
        period.starts_at,
        period.ends_at,
        project_id,
    )
    previous_tasks = await _list_tasks_in_chunks(
        session,
        user_id,
        user_timezone,
        period.previous_starts_at,
        period.previous_ends_at,
        project_id,
    )
    category_value = category.value if category else None
    return build_dashboard_response(
        current_tasks=current_tasks,
        previous_tasks=previous_tasks,
        projects=projects,
        period=period,
        dashboard_range=dashboard_range,
        user_timezone=user_timezone,
        category=category_value,
        project=project,
    )


def build_dashboard_response(
    *,
    current_tasks: list[TaskResponse],
    previous_tasks: list[TaskResponse],
    projects: list[Project],
    period: _PeriodWindow,
    dashboard_range: DashboardRange,
    user_timezone: str,
    category: str | None = None,
    project: Project | None = None,
) -> DashboardResponse:
    filtered_current = _filter_tasks(current_tasks, category)
    filtered_previous = _filter_tasks(previous_tasks, category)
    current_summary = _summarize(filtered_current)
    previous_summary = _summarize(filtered_previous)

    return DashboardResponse(
        scope=DashboardScope(
            type="project" if project else "all",
            project_id=project.id if project else None,
            project_name=project.name if project else None,
        ),
        range=dashboard_range,
        category_filter=category,
        period=DashboardPeriod(
            starts_at=period.starts_at,
            ends_at=period.ends_at,
            previous_starts_at=period.previous_starts_at,
            previous_ends_at=period.previous_ends_at,
            timezone=user_timezone,
            bucket=period.bucket,
        ),
        summary=current_summary,
        previous_summary=previous_summary,
        trends=_build_trends(current_summary, previous_summary),
        series=_build_series(filtered_current, period, user_timezone),
        status_distribution=_status_distribution(filtered_current),
        category_breakdown=_category_breakdown(filtered_current),
        project_progress=_project_progress(
            filtered_current,
            [project]
            if project
            else [item for item in projects if item.status != "archived"],
        ),
    )


async def _list_tasks_in_chunks(
    session: AsyncSession,
    user_id: UUID,
    user_timezone: str,
    starts_at: datetime,
    ends_at: datetime,
    project_id: UUID | None,
) -> list[TaskResponse]:
    if ends_at <= starts_at:
        return []

    items: dict[tuple[UUID, object], TaskResponse] = {}
    chunk_start = starts_at
    while chunk_start < ends_at:
        chunk_end = min(chunk_start + timedelta(days=62), ends_at)
        chunk = await task_service.list_tasks(
            session,
            user_id,
            user_timezone,
            chunk_start,
            chunk_end,
            project_id,
        )
        for item in chunk:
            items[(item.id, item.series_date)] = item
        chunk_start = chunk_end
    return sorted(items.values(), key=lambda item: (item.starts_at, item.title.lower()))


def _resolve_period(
    dashboard_range: DashboardRange,
    user_timezone: str,
    now: datetime,
) -> _PeriodWindow:
    if now.utcoffset() is None:
        raise ValueError("Dashboard reference time must be timezone-aware.")
    zone = ZoneInfo(user_timezone)
    local_now = now.astimezone(zone)

    if dashboard_range == DashboardRange.WEEK:
        current_start = datetime.combine(
            local_now.date() - timedelta(days=local_now.weekday()), time.min, zone
        )
        previous_start = current_start - timedelta(days=7)
        previous_end = local_now - timedelta(days=7)
        bucket = "day"
    elif dashboard_range == DashboardRange.MONTH:
        current_start = local_now.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        previous_start = _shift_months(current_start, -1).replace(day=1)
        previous_end = _shift_months(local_now, -1)
        bucket = "day"
    else:
        months = 3 if dashboard_range == DashboardRange.THREE_MONTHS else 6
        current_start = _shift_months(
            local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
            -(months - 1),
        )
        previous_start = _shift_months(current_start, -months)
        previous_end = _shift_months(local_now, -months)
        bucket = "month"

    return _PeriodWindow(
        starts_at=current_start.astimezone(timezone.utc),
        ends_at=local_now.astimezone(timezone.utc),
        previous_starts_at=previous_start.astimezone(timezone.utc),
        previous_ends_at=previous_end.astimezone(timezone.utc),
        bucket=bucket,
    )


def _shift_months(value: datetime, months: int) -> datetime:
    month_index = value.year * 12 + value.month - 1 + months
    year, zero_based_month = divmod(month_index, 12)
    month = zero_based_month + 1
    day = min(value.day, monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def _filter_tasks(tasks: list[TaskResponse], category: str | None) -> list[TaskResponse]:
    if category is None:
        return tasks
    return [task for task in tasks if category in task.categories]


def _task_planned_minutes(task: TaskResponse) -> int:
    if task.estimated_minutes is not None:
        return task.estimated_minutes
    return max(1, ceil((task.ends_at - task.starts_at).total_seconds() / 60))


def _summarize(tasks: list[TaskResponse]) -> DashboardSummary:
    statuses = {"todo": 0, "in_progress": 0, "done": 0}
    planned_minutes = 0
    completed_planned_minutes = 0
    for task in tasks:
        statuses[task.status] = statuses.get(task.status, 0) + 1
        minutes = _task_planned_minutes(task)
        planned_minutes += minutes
        if task.status == "done":
            completed_planned_minutes += minutes
    total = len(tasks)
    return DashboardSummary(
        total_tasks=total,
        todo_tasks=statuses["todo"],
        in_progress_tasks=statuses["in_progress"],
        done_tasks=statuses["done"],
        completion_rate=_percentage(statuses["done"], total),
        planned_minutes=planned_minutes,
        completed_planned_minutes=completed_planned_minutes,
    )


def _build_trends(
    current: DashboardSummary, previous: DashboardSummary
) -> DashboardTrends:
    return DashboardTrends(
        total_tasks=_trend(current.total_tasks, previous.total_tasks),
        done_tasks=_trend(current.done_tasks, previous.done_tasks),
        completion_rate=_trend(current.completion_rate, previous.completion_rate),
        planned_minutes=_trend(current.planned_minutes, previous.planned_minutes),
        completed_planned_minutes=_trend(
            current.completed_planned_minutes,
            previous.completed_planned_minutes,
        ),
    )


def _trend(current: float, previous: float) -> DashboardTrend:
    if previous == 0:
        if current == 0:
            return DashboardTrend(
                current=current,
                previous=previous,
                change_percent=0.0,
                direction="flat",
            )
        return DashboardTrend(
            current=current,
            previous=previous,
            change_percent=None,
            direction="new",
        )
    change = round(((current - previous) / abs(previous)) * 100, 1)
    direction = "up" if change > 0 else "down" if change < 0 else "flat"
    return DashboardTrend(
        current=current,
        previous=previous,
        change_percent=change,
        direction=direction,
    )


def _build_series(
    tasks: list[TaskResponse], period: _PeriodWindow, user_timezone: str
) -> list[DashboardSeriesPoint]:
    zone = ZoneInfo(user_timezone)
    local_start = period.starts_at.astimezone(zone)
    local_end = period.ends_at.astimezone(zone)
    buckets: list[datetime] = []
    cursor = (
        local_start.replace(hour=0, minute=0, second=0, microsecond=0)
        if period.bucket == "day"
        else local_start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    )
    while cursor <= local_end:
        buckets.append(cursor)
        cursor = (
            cursor + timedelta(days=1)
            if period.bucket == "day"
            else _shift_months(cursor, 1)
        )

    values: dict[datetime, dict[str, int]] = {
        bucket: {"total": 0, "done": 0, "minutes": 0} for bucket in buckets
    }
    for task in tasks:
        task_local = task.starts_at.astimezone(zone)
        key = (
            task_local.replace(hour=0, minute=0, second=0, microsecond=0)
            if period.bucket == "day"
            else task_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        )
        if key not in values and buckets and key < buckets[0]:
            key = buckets[0]
        if key not in values:
            continue
        values[key]["total"] += 1
        if task.status == "done":
            values[key]["done"] += 1
            values[key]["minutes"] += _task_planned_minutes(task)

    return [
        DashboardSeriesPoint(
            starts_at=bucket.astimezone(timezone.utc),
            label=(
                f"{month_abbr[bucket.month]} {bucket.day}"
                if period.bucket == "day"
                else f"{month_abbr[bucket.month]} {bucket.year}"
            ),
            total_tasks=values[bucket]["total"],
            done_tasks=values[bucket]["done"],
            completed_planned_minutes=values[bucket]["minutes"],
        )
        for bucket in buckets
    ]


def _status_distribution(
    tasks: list[TaskResponse],
) -> list[StatusDistributionItem]:
    summary = _summarize(tasks)
    counts = {
        "todo": summary.todo_tasks,
        "in_progress": summary.in_progress_tasks,
        "done": summary.done_tasks,
    }
    return [
        StatusDistributionItem(
            status=cast(Literal["todo", "in_progress", "done"], status),
            count=count,
            percentage=_percentage(count, summary.total_tasks),
        )
        for status, count in counts.items()
    ]


def _category_breakdown(tasks: list[TaskResponse]) -> list[CategoryBreakdownItem]:
    values: dict[str, dict[str, int]] = {}
    for task in tasks:
        primary = task.categories[0] if task.categories else "other"
        item = values.setdefault(primary, {"count": 0, "done": 0, "minutes": 0})
        item["count"] += 1
        if task.status == "done":
            item["done"] += 1
            item["minutes"] += _task_planned_minutes(task)
    return [
        CategoryBreakdownItem(
            category=category,
            count=value["count"],
            done_count=value["done"],
            completed_planned_minutes=value["minutes"],
            percentage=_percentage(value["count"], len(tasks)),
        )
        for category, value in sorted(
            values.items(), key=lambda item: (-item[1]["count"], item[0])
        )
    ]


def _project_progress(
    tasks: list[TaskResponse], projects: list[Project]
) -> list[ProjectProgressItem]:
    items: list[ProjectProgressItem] = []
    for project in sorted(projects, key=lambda item: (item.position, item.name.lower())):
        project_tasks = [task for task in tasks if project.id in task.project_ids]
        summary = _summarize(project_tasks)
        items.append(
            ProjectProgressItem(
                project_id=project.id,
                name=project.name,
                color=project.color,
                status=project.status,
                total_tasks=summary.total_tasks,
                completed_tasks=summary.done_tasks,
                completion_rate=summary.completion_rate,
                planned_minutes=summary.planned_minutes,
                completed_planned_minutes=summary.completed_planned_minutes,
            )
        )
    return items


def _percentage(value: int, total: int) -> float:
    return round((value / total) * 100, 1) if total else 0.0
