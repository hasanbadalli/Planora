"""normalize task statuses and support project archiving

Revision ID: 20260721_0003
Revises: 20260721_0002
Create Date: 2026-07-21
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260721_0003"
down_revision: str | None = "20260721_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_tasks_status", "tasks", type_="check")
    op.execute(
        sa.text(
            """
            UPDATE tasks
            SET status = CASE
                WHEN status = 'completed' THEN 'done'
                WHEN status = 'in_progress' THEN 'in_progress'
                ELSE 'todo'
            END,
            completed_at = CASE
                WHEN status = 'completed' THEN COALESCE(completed_at, updated_at)
                ELSE NULL
            END
            """
        )
    )
    op.alter_column("tasks", "status", server_default="todo", existing_type=sa.String(length=24))
    op.create_check_constraint("ck_tasks_status", "tasks", "status IN ('todo', 'in_progress', 'done')")

    op.execute(
        sa.text(
            """
            UPDATE task_occurrences
            SET status_override = CASE
                WHEN status_override = 'completed' THEN 'done'
                WHEN status_override = 'in_progress' THEN 'in_progress'
                WHEN status_override IS NULL THEN NULL
                ELSE 'todo'
            END
            """
        )
    )

    op.drop_constraint("ck_projects_status", "projects", type_="check")
    op.create_check_constraint(
        "ck_projects_status",
        "projects",
        "status IN ('active', 'paused', 'completed', 'archived')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_projects_status", "projects", type_="check")
    op.execute("UPDATE projects SET status = 'paused' WHERE status = 'archived'")
    op.create_check_constraint(
        "ck_projects_status",
        "projects",
        "status IN ('active', 'paused', 'completed')",
    )

    op.drop_constraint("ck_tasks_status", "tasks", type_="check")
    op.execute(
        """
        UPDATE tasks
        SET status = CASE
            WHEN status = 'done' THEN 'completed'
            WHEN status = 'in_progress' THEN 'in_progress'
            ELSE 'planned'
        END
        """
    )
    op.execute(
        """
        UPDATE task_occurrences
        SET status_override = CASE
            WHEN status_override = 'done' THEN 'completed'
            WHEN status_override = 'in_progress' THEN 'in_progress'
            WHEN status_override IS NULL THEN NULL
            ELSE 'planned'
        END
        """
    )
    op.alter_column("tasks", "status", server_default="planned", existing_type=sa.String(length=24))
    op.create_check_constraint(
        "ck_tasks_status",
        "tasks",
        "status IN ('planned', 'in_progress', 'completed', 'cancelled')",
    )
