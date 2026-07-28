"""support ordered task projects and categories

Revision ID: 20260722_0004
Revises: 20260721_0003
Create Date: 2026-07-22
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260722_0004"
down_revision: str | None = "20260721_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


CATEGORIES = (
    "coding",
    "reading",
    "meeting",
    "study",
    "planning",
    "personal",
    "exercise",
    "other",
)


def upgrade() -> None:
    op.create_table(
        "task_projects",
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("task_id", "project_id"),
        sa.UniqueConstraint("task_id", "position", name="uq_task_projects_position"),
    )
    op.create_index(
        "ix_task_projects_project_task", "task_projects", ["project_id", "task_id"]
    )

    op.create_table(
        "task_categories",
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            f"category IN {CATEGORIES}", name="ck_task_categories_category"
        ),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("task_id", "category"),
        sa.UniqueConstraint("task_id", "position", name="uq_task_categories_position"),
    )
    op.create_index(
        "ix_task_categories_category_task",
        "task_categories",
        ["category", "task_id"],
    )

    op.execute(
        """
        INSERT INTO task_projects (task_id, project_id, position, created_at)
        SELECT id, project_id, 0, created_at
        FROM tasks
        WHERE project_id IS NOT NULL
        """
    )
    op.execute(
        """
        INSERT INTO task_categories (task_id, category, position, created_at)
        SELECT id, category, 0, created_at
        FROM tasks
        """
    )

    op.drop_index("ix_tasks_project_starts_at", table_name="tasks")
    op.drop_column("tasks", "project_id")
    op.drop_column("tasks", "category")


def downgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "tasks",
        sa.Column(
            "category",
            sa.String(length=32),
            server_default="other",
            nullable=False,
        ),
    )
    op.create_foreign_key(
        "fk_tasks_project_id_projects",
        "tasks",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(
        """
        UPDATE tasks AS task
        SET project_id = link.project_id
        FROM task_projects AS link
        WHERE link.task_id = task.id AND link.position = 0
        """
    )
    op.execute(
        """
        UPDATE tasks AS task
        SET category = link.category
        FROM task_categories AS link
        WHERE link.task_id = task.id AND link.position = 0
        """
    )
    op.create_index(
        "ix_tasks_project_starts_at", "tasks", ["project_id", "starts_at"]
    )
    op.drop_index("ix_task_categories_category_task", table_name="task_categories")
    op.drop_table("task_categories")
    op.drop_index("ix_task_projects_project_task", table_name="task_projects")
    op.drop_table("task_projects")
