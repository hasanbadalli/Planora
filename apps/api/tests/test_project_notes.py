import asyncio
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.exceptions import ResourceNotFoundError
from app.schemas.projects import (
    FuturePlanUpdate,
    ProjectNoteCreate,
    ProjectNoteUpdate,
    ProjectUpdate,
)
from app.services import projects as project_service


def test_project_note_schema_is_small_and_editable() -> None:
    create = ProjectNoteCreate(title="  Architecture ideas  ", content="Keep it simple.")
    update = ProjectNoteUpdate(content=None)

    assert create.title == "Architecture ideas"
    assert update.model_dump(exclude_unset=True) == {"content": None}

    with pytest.raises(ValidationError):
        ProjectNoteCreate(title="   ")

    with pytest.raises(ValidationError):
        ProjectNoteUpdate(title=None)
    with pytest.raises(ValidationError):
        FuturePlanUpdate(title=None)
    with pytest.raises(ValidationError):
        ProjectUpdate(name=None)


def test_project_note_creation_checks_project_ownership_first(monkeypatch) -> None:
    async def reject_project(*args, **kwargs):
        raise ResourceNotFoundError("Project was not found.")

    monkeypatch.setattr(project_service, "get_owned_project", reject_project)
    session = AsyncMock()

    async def run() -> None:
        with pytest.raises(ResourceNotFoundError):
            await project_service.create_project_note(
                session,
                uuid4(),
                uuid4(),
                ProjectNoteCreate(title="Private note"),
            )
        session.commit.assert_not_awaited()

    asyncio.run(run())
