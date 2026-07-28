from datetime import date, datetime, timedelta
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints, model_validator


class TaskCategory(StrEnum):
    CODING = "coding"
    READING = "reading"
    MEETING = "meeting"
    STUDY = "study"
    PLANNING = "planning"
    PERSONAL = "personal"
    EXERCISE = "exercise"
    OTHER = "other"


TaskDifficulty = Literal["easy", "medium", "hard"]
TaskStatus = Literal["todo", "in_progress", "done"]
OccurrenceUpdateScope = Literal["occurrence", "future"]
TaskTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class TaskCreate(BaseModel):
    title: TaskTitle
    description: str | None = Field(default=None, max_length=4000)
    project_ids: list[UUID] = Field(default_factory=list, max_length=8)
    categories: list[TaskCategory] = Field(
        default_factory=lambda: [TaskCategory.OTHER], min_length=1, max_length=8
    )
    project_id: UUID | None = Field(default=None, deprecated=True)
    category: TaskCategory | None = Field(default=None, deprecated=True)
    difficulty: TaskDifficulty | None = None
    estimated_minutes: int | None = Field(default=None, ge=1, le=10_080)
    starts_at: datetime
    ends_at: datetime
    weekly_repeat: bool = False
    status: TaskStatus = "todo"

    @model_validator(mode="after")
    def validate_time_range(self) -> "TaskCreate":
        _validate_aware_range(self.starts_at, self.ends_at)
        if "project_ids" not in self.model_fields_set and self.project_id is not None:
            self.project_ids = [self.project_id]
        if "categories" not in self.model_fields_set and self.category is not None:
            self.categories = [self.category]
        _validate_unique(self.project_ids, "project_ids")
        _validate_unique(self.categories, "categories")
        return self


class TaskUpdate(BaseModel):
    title: TaskTitle | None = None
    description: str | None = Field(default=None, max_length=4000)
    project_ids: list[UUID] | None = Field(default=None, max_length=8)
    categories: list[TaskCategory] | None = Field(
        default=None, min_length=1, max_length=8
    )
    project_id: UUID | None = Field(default=None, deprecated=True)
    category: TaskCategory | None = Field(default=None, deprecated=True)
    difficulty: TaskDifficulty | None = None
    estimated_minutes: int | None = Field(default=None, ge=1, le=10_080)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    weekly_repeat: bool | None = None
    status: TaskStatus | None = None

    @model_validator(mode="after")
    def validate_supplied_time_range(self) -> "TaskUpdate":
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("title cannot be null.")
        if self.starts_at is not None and self.starts_at.utcoffset() is None:
            raise ValueError("starts_at must include a timezone offset.")
        if self.ends_at is not None and self.ends_at.utcoffset() is None:
            raise ValueError("ends_at must include a timezone offset.")
        if self.starts_at is not None and self.ends_at is not None:
            _validate_aware_range(self.starts_at, self.ends_at)
        if "project_ids" not in self.model_fields_set and "project_id" in self.model_fields_set:
            self.project_ids = [] if self.project_id is None else [self.project_id]
            self.__pydantic_fields_set__.add("project_ids")
        if "categories" not in self.model_fields_set and "category" in self.model_fields_set:
            self.categories = [self.category or TaskCategory.OTHER]
            self.__pydantic_fields_set__.add("categories")
        if self.project_ids is not None:
            _validate_unique(self.project_ids, "project_ids")
        if self.categories is not None:
            _validate_unique(self.categories, "categories")
        return self


class TaskResponse(BaseModel):
    id: UUID
    project_ids: list[UUID]
    categories: list[str]
    project_id: UUID | None
    title: str
    description: str | None
    category: str
    difficulty: str | None
    estimated_minutes: int | None
    status: str
    starts_at: datetime
    ends_at: datetime
    weekly_repeat: bool
    occurrence_date: date
    series_date: date
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TaskOccurrenceUpdate(BaseModel):
    scope: OccurrenceUpdateScope = "occurrence"
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: TaskStatus | None = None

    @model_validator(mode="after")
    def validate_update(self) -> "TaskOccurrenceUpdate":
        if self.starts_at is None and self.ends_at is None and self.status is None:
            raise ValueError("At least one occurrence change is required.")
        if (self.starts_at is None) != (self.ends_at is None):
            raise ValueError("starts_at and ends_at must be supplied together.")
        if self.starts_at is not None and self.ends_at is not None:
            _validate_aware_range(self.starts_at, self.ends_at)
        if self.scope == "future" and self.starts_at is None:
            raise ValueError("Future recurrence changes require starts_at and ends_at.")
        return self


class TaskListResponse(BaseModel):
    items: list[TaskResponse]


def _validate_aware_range(starts_at: datetime, ends_at: datetime) -> None:
    if starts_at.utcoffset() is None or ends_at.utcoffset() is None:
        raise ValueError("Task times must include a timezone offset.")
    if ends_at <= starts_at:
        raise ValueError("End time must be after start time.")
    if ends_at - starts_at > timedelta(days=7):
        raise ValueError("A task cannot be longer than seven days.")


def _validate_unique(values: list[object], field_name: str) -> None:
    if len(values) != len(set(values)):
        raise ValueError(f"{field_name} cannot contain duplicates.")
