from datetime import date, datetime, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from pydantic import ValidationError

from app.main import app
from app.models.task import RecurrenceRule, Task
from app.schemas.tasks import TaskCreate, TaskOccurrenceUpdate, TaskUpdate
from app.services.tasks import _set_task_status, _weekly_occurrences
from app.services.projects import DEFAULT_PROJECTS


def test_task_schema_requires_timezone_and_forward_time() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(
            title="Invalid task",
            starts_at=datetime(2026, 7, 21, 10, 0),
            ends_at=datetime(2026, 7, 21, 11, 0),
        )


def test_task_estimated_duration_is_optional_and_bounded() -> None:
    payload = TaskCreate(
        title="Estimated focus",
        estimated_minutes=75,
        starts_at=datetime(2026, 7, 21, 10, 0, tzinfo=timezone.utc),
        ends_at=datetime(2026, 7, 21, 11, 0, tzinfo=timezone.utc),
    )

    assert payload.estimated_minutes == 75
    assert TaskUpdate(estimated_minutes=None).model_dump(exclude_unset=True) == {
        "estimated_minutes": None
    }

    with pytest.raises(ValidationError):
        TaskCreate(
            title="Zero duration",
            estimated_minutes=0,
            starts_at=datetime(2026, 7, 21, 10, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 7, 21, 11, 0, tzinfo=timezone.utc),
        )

    with pytest.raises(ValidationError):
        TaskUpdate(estimated_minutes=10_081)

    with pytest.raises(ValidationError):
        TaskUpdate(title=None)

    with pytest.raises(ValidationError):
        TaskCreate(
            title="   ",
            starts_at=datetime(2026, 7, 21, 10, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 7, 21, 11, 0, tzinfo=timezone.utc),
        )

    with pytest.raises(ValidationError):
        TaskCreate(
            title="Invalid task",
            starts_at=datetime(2026, 7, 21, 11, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 7, 21, 10, 0, tzinfo=timezone.utc),
        )


def test_weekly_recurrence_is_calculated_without_materialized_rows() -> None:
    user_id = uuid4()
    rule = RecurrenceRule(
        id=uuid4(),
        user_id=user_id,
        frequency="weekly",
        interval=1,
        by_weekdays=[1],
        starts_on=date(2026, 7, 21),
        timezone="Asia/Baku",
    )
    task = Task(
        id=uuid4(),
        user_id=user_id,
        title="Weekly focus",
        starts_at=datetime(2026, 7, 21, 5, 0, tzinfo=timezone.utc),
        ends_at=datetime(2026, 7, 21, 6, 30, tzinfo=timezone.utc),
    )

    occurrences = _weekly_occurrences(
        task,
        rule,
        datetime(2026, 7, 20, tzinfo=timezone.utc),
        datetime(2026, 8, 5, tzinfo=timezone.utc),
    )

    assert len(occurrences) == 3
    assert all(end - start == task.ends_at - task.starts_at for start, end in occurrences)
    assert [start.astimezone(ZoneInfo("Asia/Baku")).hour for start, _ in occurrences] == [9, 9, 9]


def test_planning_routes_are_versioned() -> None:
    paths = app.openapi()["paths"]

    assert "/api/v1/tasks" in paths
    assert "/api/v1/tasks/{task_id}" in paths
    assert "/api/v1/projects" in paths
    assert "/api/v1/projects/{project_id}/future-plans" in paths
    assert "/api/v1/tasks/{task_id}/occurrences/{occurrence_date}" in paths
    assert "/api/v1/dashboard" in paths
    assert "/api/v1/projects/{project_id}/statistics" in paths
    assert "/api/v1/projects/{project_id}/notes" in paths
    assert "/api/v1/projects/{project_id}/notes/{note_id}" in paths
    assert "delete" in paths["/api/v1/projects/{project_id}"]


def test_task_status_contract_and_completion_timestamp() -> None:
    update = TaskUpdate(status="done")
    assert update.status == "done"
    with pytest.raises(ValidationError):
        TaskUpdate(status="completed")

    task = Task(
        id=uuid4(),
        user_id=uuid4(),
        title="Completion semantics",
        starts_at=datetime(2026, 7, 21, 5, 0, tzinfo=timezone.utc),
        ends_at=datetime(2026, 7, 21, 6, 0, tzinfo=timezone.utc),
        status="todo",
    )
    _set_task_status(task, "done")
    assert task.status == "done"
    assert task.completed_at is not None
    _set_task_status(task, "in_progress")
    assert task.completed_at is None


def test_occurrence_update_requires_a_complete_time_range() -> None:
    with pytest.raises(ValidationError):
        TaskOccurrenceUpdate(scope="occurrence", starts_at=datetime.now(timezone.utc))
    with pytest.raises(ValidationError):
        TaskOccurrenceUpdate(scope="future", status="todo")


def test_task_supports_ordered_projects_and_categories() -> None:
    first_project = uuid4()
    second_project = uuid4()
    task = TaskCreate(
        title="Cross-project research",
        project_ids=[first_project, second_project],
        categories=["reading", "study", "planning"],
        starts_at=datetime(2026, 7, 21, 10, 0, tzinfo=timezone.utc),
        ends_at=datetime(2026, 7, 21, 11, 0, tzinfo=timezone.utc),
    )

    assert task.project_ids == [first_project, second_project]
    assert [category.value for category in task.categories] == [
        "reading",
        "study",
        "planning",
    ]

    with pytest.raises(ValidationError):
        TaskCreate(
            title="Duplicate category",
            categories=["coding", "coding"],
            starts_at=datetime(2026, 7, 21, 10, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 7, 21, 11, 0, tzinfo=timezone.utc),
        )


def test_legacy_task_assignment_fields_are_normalized() -> None:
    project_id = uuid4()
    create = TaskCreate(
        title="Legacy client",
        project_id=project_id,
        category="coding",
        starts_at=datetime(2026, 7, 21, 10, 0, tzinfo=timezone.utc),
        ends_at=datetime(2026, 7, 21, 11, 0, tzinfo=timezone.utc),
    )
    update = TaskUpdate(project_id=None, category="reading")

    assert create.project_ids == [project_id]
    assert create.categories == ["coding"]
    assert update.model_dump(exclude_unset=True)["project_ids"] == []
    assert update.model_dump(exclude_unset=True)["categories"] == ["reading"]


def test_new_users_receive_five_distinct_default_projects() -> None:
    assert [item[0] for item in DEFAULT_PROJECTS] == [
        "Self Improvement",
        "Reading",
        "Personal Tasks",
        "Learning",
        "Health & Fitness",
    ]
    assert len({item[2] for item in DEFAULT_PROJECTS}) == 5
