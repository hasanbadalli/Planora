from datetime import datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class DashboardRange(StrEnum):
    WEEK = "week"
    MONTH = "month"
    THREE_MONTHS = "3_months"
    SIX_MONTHS = "6_months"


class DashboardScope(BaseModel):
    type: Literal["all", "project"]
    project_id: UUID | None = None
    project_name: str | None = None


class DashboardPeriod(BaseModel):
    starts_at: datetime
    ends_at: datetime
    previous_starts_at: datetime
    previous_ends_at: datetime
    timezone: str
    bucket: Literal["day", "month"]


class DashboardSummary(BaseModel):
    total_tasks: int
    todo_tasks: int
    in_progress_tasks: int
    done_tasks: int
    completion_rate: float
    planned_minutes: int
    completed_planned_minutes: int


class DashboardTrend(BaseModel):
    current: float
    previous: float
    change_percent: float | None
    direction: Literal["up", "down", "flat", "new"]


class DashboardTrends(BaseModel):
    total_tasks: DashboardTrend
    done_tasks: DashboardTrend
    completion_rate: DashboardTrend
    planned_minutes: DashboardTrend
    completed_planned_minutes: DashboardTrend


class DashboardSeriesPoint(BaseModel):
    starts_at: datetime
    label: str
    total_tasks: int
    done_tasks: int
    completed_planned_minutes: int


class StatusDistributionItem(BaseModel):
    status: Literal["todo", "in_progress", "done"]
    count: int
    percentage: float


class CategoryBreakdownItem(BaseModel):
    category: str
    count: int
    done_count: int
    completed_planned_minutes: int
    percentage: float


class ProjectProgressItem(BaseModel):
    project_id: UUID
    name: str
    color: str
    status: str
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    planned_minutes: int
    completed_planned_minutes: int


class DashboardResponse(BaseModel):
    scope: DashboardScope
    range: DashboardRange
    category_filter: str | None
    period: DashboardPeriod
    summary: DashboardSummary
    previous_summary: DashboardSummary
    trends: DashboardTrends
    series: list[DashboardSeriesPoint]
    status_distribution: list[StatusDistributionItem]
    category_breakdown: list[CategoryBreakdownItem]
    project_progress: list[ProjectProgressItem]
