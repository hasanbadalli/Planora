# Planora API

FastAPI backend for Planora, built with Pydantic, SQLAlchemy 2 async, psycopg 3, and Alembic.

The API currently provides health checks, HttpOnly-cookie authentication, default project provisioning, projects, tasks with estimated duration, bounded weekly recurrence, occurrence override storage, future plans, project notes, and shared general/project dashboard statistics. All endpoints use `/api/v1`.

Keep the layer direction `routes → services → repositories → models/database`. Routes must not contain business logic or SQL. Every user-owned operation requires ownership scope.

See the root `README.md` for environment setup and migrations. Windows must start Uvicorn with the compatible selector loop:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --loop app.core.event_loop:create_compatible_event_loop
```

Run tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```
