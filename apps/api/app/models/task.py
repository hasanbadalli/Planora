from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import (
    ARRAY,
    JSONB,
    SMALLINT,
    UUID as PostgreSQLUUID,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class RecurrenceRule(Base):
    __tablename__ = "recurrence_rules"
    __table_args__ = (Index("ix_recurrence_rules_user", "user_id"),)

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    frequency: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="weekly"
    )
    interval: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    by_weekdays: Mapped[list[int]] = mapped_column(ARRAY(SMALLINT), nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class TaskProject(Base):
    __tablename__ = "task_projects"
    __table_args__ = (
        UniqueConstraint("task_id", "position", name="uq_task_projects_position"),
        Index("ix_task_projects_project_task", "project_id", "task_id"),
    )

    task_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    project_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    task: Mapped[Task] = relationship(back_populates="project_links")


class TaskCategoryLink(Base):
    __tablename__ = "task_categories"
    __table_args__ = (
        CheckConstraint(
            "category IN ('coding', 'reading', 'meeting', 'study', "
            "'planning', 'personal', 'exercise', 'other')",
            name="ck_task_categories_category",
        ),
        UniqueConstraint("task_id", "position", name="uq_task_categories_position"),
        Index("ix_task_categories_category_task", "category", "task_id"),
    )

    task_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category: Mapped[str] = mapped_column(String(32), primary_key=True)
    position: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    task: Mapped[Task] = relationship(back_populates="category_links")


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_user_starts_at", "user_id", "starts_at"),
        Index("ix_tasks_user_status", "user_id", "status"),
        Index("ix_tasks_recurrence_rule", "recurrence_rule_id"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_task_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="task"
    )
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="todo"
    )
    priority: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="medium"
    )
    difficulty: Mapped[str | None] = mapped_column(String(16), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_all_day: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    recurrence_rule_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("recurrence_rules.id", ondelete="SET NULL"),
    )
    position: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    project_links: Mapped[list[TaskProject]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="TaskProject.position",
    )
    category_links: Mapped[list[TaskCategoryLink]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="TaskCategoryLink.position",
    )


class TaskOccurrence(Base):
    __tablename__ = "task_occurrences"
    __table_args__ = (
        UniqueConstraint(
            "task_id", "occurrence_date", name="uq_task_occurrences_task_date"
        ),
        Index("ix_task_occurrences_user_date", "user_id", "occurrence_date"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    task_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
    )
    occurrence_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_skipped: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    starts_at_override: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    ends_at_override: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    title_override: Mapped[str | None] = mapped_column(String(200))
    status_override: Mapped[str | None] = mapped_column(String(24))
    override_data: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
