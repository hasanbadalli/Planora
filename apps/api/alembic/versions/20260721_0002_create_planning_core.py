"""create planning core tables

Revision ID: 20260721_0002
Revises: 20260721_0001
Create Date: 2026-07-21
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260721_0002"
down_revision: str | None = "20260721_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps(include_deleted: bool = True) -> list[sa.Column]:
    columns = [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]
    if include_deleted:
        columns.append(sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    return columns


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.String(length=7), server_default="#486B57", nullable=False),
        sa.Column("status", sa.String(length=24), server_default="active", nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        *_timestamps(),
        sa.CheckConstraint("color ~ '^#[0-9A-Fa-f]{6}$'", name="ck_projects_color_hex"),
        sa.CheckConstraint("status IN ('active', 'paused', 'completed')", name="ck_projects_status"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_user_position", "projects", ["user_id", "position"])
    op.create_index(
        "uq_projects_user_name_lower_active",
        "projects",
        ["user_id", sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "recurrence_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("frequency", sa.String(length=16), server_default="weekly", nullable=False),
        sa.Column("interval", sa.Integer(), server_default="1", nullable=False),
        sa.Column("by_weekdays", postgresql.ARRAY(sa.SmallInteger()), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        *_timestamps(include_deleted=False),
        sa.CheckConstraint("frequency = 'weekly'", name="ck_recurrence_rules_frequency"),
        sa.CheckConstraint("interval > 0", name="ck_recurrence_rules_interval"),
        sa.CheckConstraint("by_weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]", name="ck_recurrence_rules_weekdays"),
        sa.CheckConstraint("ends_on IS NULL OR ends_on >= starts_on", name="ck_recurrence_rules_dates"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recurrence_rules_user", "recurrence_rules", ["user_id"])

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("parent_task_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("task_type", sa.String(length=32), server_default="task", nullable=False),
        sa.Column("category", sa.String(length=32), server_default="other", nullable=False),
        sa.Column("status", sa.String(length=24), server_default="planned", nullable=False),
        sa.Column("priority", sa.String(length=16), server_default="medium", nullable=False),
        sa.Column("difficulty", sa.String(length=16), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_all_day", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recurrence_rule_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        *_timestamps(),
        sa.CheckConstraint("ends_at > starts_at", name="ck_tasks_time_range"),
        sa.CheckConstraint("estimated_minutes IS NULL OR estimated_minutes > 0", name="ck_tasks_estimated_minutes"),
        sa.CheckConstraint("difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard')", name="ck_tasks_difficulty"),
        sa.CheckConstraint("status IN ('planned', 'in_progress', 'completed', 'cancelled')", name="ck_tasks_status"),
        sa.ForeignKeyConstraint(["parent_task_id"], ["tasks.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recurrence_rule_id"], ["recurrence_rules.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_project_starts_at", "tasks", ["project_id", "starts_at"])
    op.create_index("ix_tasks_recurrence_rule", "tasks", ["recurrence_rule_id"])
    op.create_index("ix_tasks_user_starts_at", "tasks", ["user_id", "starts_at"])
    op.create_index("ix_tasks_user_status", "tasks", ["user_id", "status"])

    op.create_table(
        "task_occurrences",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("occurrence_date", sa.Date(), nullable=False),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_skipped", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("starts_at_override", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at_override", sa.DateTime(timezone=True), nullable=True),
        sa.Column("title_override", sa.String(length=200), nullable=True),
        sa.Column("status_override", sa.String(length=24), nullable=True),
        sa.Column("override_data", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        *_timestamps(include_deleted=False),
        sa.CheckConstraint(
            "starts_at_override IS NULL OR ends_at_override IS NULL OR ends_at_override > starts_at_override",
            name="ck_task_occurrences_time_range",
        ),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "occurrence_date", name="uq_task_occurrences_task_date"),
    )
    op.create_index("ix_task_occurrences_user_date", "task_occurrences", ["user_id", "occurrence_date"])

    op.create_table(
        "future_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=24), server_default="planned", nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        *_timestamps(),
        sa.CheckConstraint("status IN ('planned', 'in_progress', 'completed')", name="ck_future_plans_status"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_future_plans_project_position", "future_plans", ["project_id", "position"])


def downgrade() -> None:
    op.drop_index("ix_future_plans_project_position", table_name="future_plans")
    op.drop_table("future_plans")
    op.drop_index("ix_task_occurrences_user_date", table_name="task_occurrences")
    op.drop_table("task_occurrences")
    op.drop_index("ix_tasks_user_status", table_name="tasks")
    op.drop_index("ix_tasks_user_starts_at", table_name="tasks")
    op.drop_index("ix_tasks_recurrence_rule", table_name="tasks")
    op.drop_index("ix_tasks_project_starts_at", table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("ix_recurrence_rules_user", table_name="recurrence_rules")
    op.drop_table("recurrence_rules")
    op.drop_index("uq_projects_user_name_lower_active", table_name="projects")
    op.drop_index("ix_projects_user_position", table_name="projects")
    op.drop_table("projects")
