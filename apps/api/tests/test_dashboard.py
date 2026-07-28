import asyncio
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest

from app.core.exceptions import ResourceNotFoundError
from app.models.project import Project
from app.schemas.dashboard import DashboardRange
from app.schemas.tasks import TaskResponse
from app.services import dashboard as dashboard_service
from app.services.dashboard import _PeriodWindow


def _task(
    *,
    task_id: UUID,
    project_ids: list[UUID],
    categories: list[str],
    status: str,
    starts_at: datetime,
    minutes: int,
    estimated_minutes: int | None,
) -> TaskResponse:
    return TaskResponse(
        id=task_id,
        project_ids=project_ids,
        categories=categories,
        project_id=project_ids[0] if project_ids else None,
        title="Dashboard task",
        description=None,
        category=categories[0],
        difficulty=None,
        estimated_minutes=estimated_minutes,
        status=status,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=minutes),
        weekly_repeat=False,
        occurrence_date=starts_at.date(),
        series_date=starts_at.date(),
        completed_at=starts_at if status == "done" else None,
        created_at=starts_at,
        updated_at=starts_at,
    )


def test_dashboard_aggregates_duration_trends_filters_and_project_progress() -> None:
    owner_id = uuid4()
    first_id = uuid4()
    second_id = uuid4()
    first = Project(
        id=first_id,
        user_id=owner_id,
        name="Learning",
        color="#7765A8",
        status="active",
        position=0,
    )
    second = Project(
        id=second_id,
        user_id=owner_id,
        name="Reading",
        color="#B7794B",
        status="active",
        position=1,
    )
    starts_at = datetime(2026, 7, 21, 9, 0, tzinfo=timezone.utc)
    current = [
        _task(
            task_id=uuid4(),
            project_ids=[first_id],
            categories=["coding", "planning"],
            status="done",
            starts_at=starts_at,
            minutes=60,
            estimated_minutes=75,
        ),
        _task(
            task_id=uuid4(),
            project_ids=[second_id],
            categories=["reading"],
            status="todo",
            starts_at=starts_at.replace(hour=11),
            minutes=30,
            estimated_minutes=None,
        ),
        _task(
            task_id=uuid4(),
            project_ids=[first_id],
            categories=["coding"],
            status="in_progress",
            starts_at=starts_at.replace(hour=13),
            minutes=45,
            estimated_minutes=45,
        ),
    ]
    previous = [
        _task(
            task_id=uuid4(),
            project_ids=[first_id],
            categories=["coding"],
            status="done",
            starts_at=starts_at.replace(day=14),
            minutes=30,
            estimated_minutes=30,
        )
    ]
    period = _PeriodWindow(
        starts_at=datetime(2026, 7, 20, tzinfo=timezone.utc),
        ends_at=datetime(2026, 7, 23, tzinfo=timezone.utc),
        previous_starts_at=datetime(2026, 7, 13, tzinfo=timezone.utc),
        previous_ends_at=datetime(2026, 7, 16, tzinfo=timezone.utc),
        bucket="day",
    )

    result = dashboard_service.build_dashboard_response(
        current_tasks=current,
        previous_tasks=previous,
        projects=[first, second],
        period=period,
        dashboard_range=DashboardRange.WEEK,
        user_timezone="UTC",
        category="coding",
    )

    assert result.summary.total_tasks == 2
    assert result.summary.done_tasks == 1
    assert result.summary.in_progress_tasks == 1
    assert result.summary.planned_minutes == 120
    assert result.summary.completed_planned_minutes == 75
    assert result.summary.completion_rate == 50.0
    assert result.previous_summary.completed_planned_minutes == 30
    assert result.trends.completed_planned_minutes.change_percent == 150.0
    assert result.category_breakdown[0].category == "coding"
    assert result.project_progress[0].total_tasks == 2
    assert result.project_progress[1].total_tasks == 0


def test_dashboard_period_is_timezone_aware_and_compares_matching_range() -> None:
    now = datetime(2026, 7, 22, 12, 0, tzinfo=timezone.utc)

    period = dashboard_service._resolve_period(
        DashboardRange.THREE_MONTHS, "Asia/Baku", now
    )

    assert period.starts_at == datetime(2026, 4, 30, 20, 0, tzinfo=timezone.utc)
    assert period.ends_at == now
    assert period.previous_starts_at == datetime(
        2026, 1, 31, 20, 0, tzinfo=timezone.utc
    )
    assert period.previous_ends_at == datetime(
        2026, 4, 22, 12, 0, tzinfo=timezone.utc
    )
    assert period.bucket == "month"


def test_project_dashboard_checks_project_ownership_before_queries(monkeypatch) -> None:
    async def reject_project(*args, **kwargs):
        raise ResourceNotFoundError("Project was not found.")

    monkeypatch.setattr(dashboard_service, "get_owned_project", reject_project)

    async def run() -> None:
        with pytest.raises(ResourceNotFoundError):
            await dashboard_service.get_dashboard(
                object(),  # type: ignore[arg-type]
                uuid4(),
                "UTC",
                DashboardRange.WEEK,
                project_id=uuid4(),
                now=datetime(2026, 7, 22, tzinfo=timezone.utc),
            )

    asyncio.run(run())


def test_zero_baseline_trend_is_safe() -> None:
    trend = dashboard_service._trend(3, 0)

    assert trend.direction == "new"
    assert trend.change_percent is None
