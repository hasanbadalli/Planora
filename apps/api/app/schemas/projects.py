from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


ProjectName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
PlanTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
NoteTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
ProjectStatus = Literal["active", "paused", "completed", "archived"]
FuturePlanStatus = Literal["planned", "in_progress", "completed"]


class ProjectCreate(BaseModel):
    name: ProjectName
    description: str | None = Field(default=None, max_length=2000)
    color: str = Field(default="#486B57", pattern=r"^#[0-9A-Fa-f]{6}$")


class ProjectUpdate(BaseModel):
    name: ProjectName | None = None
    description: str | None = Field(default=None, max_length=2000)
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    status: ProjectStatus | None = None

    @model_validator(mode="after")
    def reject_null_name(self) -> "ProjectUpdate":
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("name cannot be null.")
        return self


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    color: str
    status: str
    position: int
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]


class FuturePlanCreate(BaseModel):
    title: PlanTitle
    description: str | None = Field(default=None, max_length=3000)
    target_date: date | None = None


class FuturePlanUpdate(BaseModel):
    title: PlanTitle | None = None
    description: str | None = Field(default=None, max_length=3000)
    target_date: date | None = None
    status: FuturePlanStatus | None = None

    @model_validator(mode="after")
    def reject_null_title(self) -> "FuturePlanUpdate":
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("title cannot be null.")
        return self


class FuturePlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    title: str
    description: str | None
    target_date: date | None
    status: str
    position: int
    created_at: datetime
    updated_at: datetime


class FuturePlanListResponse(BaseModel):
    items: list[FuturePlanResponse]


class ProjectNoteCreate(BaseModel):
    title: NoteTitle
    content: str | None = Field(default=None, max_length=20_000)


class ProjectNoteUpdate(BaseModel):
    title: NoteTitle | None = None
    content: str | None = Field(default=None, max_length=20_000)

    @model_validator(mode="after")
    def reject_null_title(self) -> "ProjectNoteUpdate":
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("title cannot be null.")
        return self


class ProjectNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    title: str
    content: str | None
    position: int
    created_at: datetime
    updated_at: datetime


class ProjectNoteListResponse(BaseModel):
    items: list[ProjectNoteResponse]
