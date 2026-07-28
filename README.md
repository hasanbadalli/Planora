# Planora

Planora is a responsive personal productivity application that connects a weekly calendar, hour-by-hour daily planning, recurring tasks, projects, and future plans in one focused workspace.

The current build includes authentication, five default projects, project/future-plan/note editing, project archive/delete, ordered multi-project task assignment, optional task effort estimates, draggable multi-category ordering with primary icons, Todo/In Progress/Done status, date-driven Daily and project Kanban boards, weekly recurrence calculated at read time, and a compact draggable/resizable 24-hour Calendar with pinned mobile time labels and live placement feedback.

The authenticated home is `/dashboard`. It provides Weekly, Monthly, Last 3 months, and Last 6 months reporting with previous-period trends, category filters, task/status activity, completed planned time, and project progress. Each project has dedicated workspace navigation for Overview, Tasks, Future Plans, Notes, and Statistics.

## Technology

- Web: Next.js 16, React 19, TypeScript, App Router, Tailwind CSS, shadcn/ui.
- API: Python, FastAPI, Pydantic, SQLAlchemy 2 async, psycopg 3, Alembic.
- Security: Argon2 password hashes and JWT HttpOnly cookie sessions.
- Database: Neon PostgreSQL.

## Structure

```text
planora/
├── apps/
│   ├── web/                 # Next.js UI
│   │   └── src/
│   │       ├── app/         # public + protected App Router pages
│   │       ├── components/  # shell, calendar, projects, tasks, UI primitives
│   │       └── lib/         # API client and date helpers
│   └── api/
│       ├── app/
│       │   ├── api/routes/  # HTTP adapters
│       │   ├── core/        # settings, database, security
│       │   ├── models/      # SQLAlchemy models
│       │   ├── schemas/     # Pydantic contracts
│       │   ├── repositories/# queries and persistence
│       │   └── services/    # use cases and domain logic
│       ├── alembic/
│       └── tests/
├── docs/
├── .gitignore
├── package.json
└── README.md
```

Commands below use Windows PowerShell and assume the repository is `D:\Projects\Planora`.

## Run both applications

After completing the backend/frontend setup once, start both development servers from the repository root:

```powershell
cd D:\Projects\Planora
.\dev.ps1
```

If PowerShell blocks local scripts, use the equivalent npm command:

```powershell
npm run dev
```

The script starts Web on `http://localhost:3000` and API on `http://localhost:8000`, keeps both browser-facing hosts consistent for authentication cookies, keeps both logs in the same terminal, and stops both process trees with `Ctrl+C`. It refuses to start a duplicate server when a requested port is already occupied. Alternative ports can be selected explicitly:

```powershell
.\dev.ps1 -ApiPort 8100 -WebPort 3100
```

After login or registration, Planora opens the Dashboard. When the database schema changes, stop the development script, apply `alembic upgrade head`, then start it again.

## 1. Neon setup

From the repository root:

```powershell
cd D:\Projects\Planora
npx neonctl@latest init
```

Never paste a real connection string into source, documentation, logs, or commits. If a Neon connection string/password was ever shared publicly, rotate the password in Neon before continuing and replace only the local `.env` value.

## 2. Backend setup

```powershell
cd D:\Projects\Planora\apps\api
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit only `apps/api/.env` with the real Neon URL and a strong random JWT secret:

```env
APP_NAME=Planora API
ENVIRONMENT=development
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
FRONTEND_ORIGINS=http://localhost:3000
JWT_SECRET_KEY=replace-with-a-strong-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=60
AUTH_COOKIE_NAME=planora_access_token
```

Apply migrations:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
```

Start the API. On Windows, the custom selector loop is required for psycopg async:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --loop app.core.event_loop:create_compatible_event_loop
```

If port 8000 is unavailable:

```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess
Get-Process -Id <PID>
```

Stop only a process you have verified belongs to Planora, or use another port and update the frontend API URL.

## 3. Frontend setup

Open a second PowerShell window:

```powershell
cd D:\Projects\Planora\apps\web
npm install
Copy-Item .env.example .env.local
npm run dev
```

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Open [http://localhost:3000](http://localhost:3000). If Next.js says another dev server already runs in this directory, use the existing URL/PID it reports instead of starting a duplicate.

## Health checks

- Application: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- Database: [http://127.0.0.1:8000/api/v1/health/database](http://127.0.0.1:8000/api/v1/health/database)
- OpenAPI: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

PowerShell verification:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/database
```

## Migrations

```powershell
cd D:\Projects\Planora\apps\api
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic history
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe change"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic downgrade -1
```

Review every autogenerated migration before applying it. Do not change production schema with manual SQL outside an approved incident procedure.

## Quality checks

```powershell
cd D:\Projects\Planora\apps\api
.\.venv\Scripts\python.exe -m pytest -q

cd D:\Projects\Planora\apps\web
npm run lint
npm run build
```

## Deploy to Vercel

Both apps deploy from this single repository as two separate Vercel projects.

1. **API project** — import the repo, set Root Directory to `apps/api`. The included `apps/api/vercel.json` and `apps/api/api/index.py` expose FastAPI as a serverless function; no build/start commands are needed. Environment variables:
   - `DATABASE_URL` — Neon **pooled** connection string
   - `JWT_SECRET_KEY` — a strong random value (do not reuse the dev secret)
   - `ENVIRONMENT=production`
   - `FRONTEND_ORIGINS=https://<web-project>.vercel.app`
2. **Web project** — import the repo again, set Root Directory to `apps/web`. Environment variables:
   - `NEXT_PUBLIC_API_URL=/api/v1`
   - `API_PROXY_TARGET=https://<api-project>.vercel.app`

   `next.config.ts` proxies `/api/v1/*` to the API project, so the HttpOnly auth cookie stays first-party (`SameSite=Lax` keeps working; two bare `*.vercel.app` domains would otherwise be cross-site and the cookie would be dropped).
3. **Migrations** — Vercel does not run Alembic. Apply schema changes from your machine against the Neon database: `cd apps/api && .\.venv\Scripts\python.exe -m alembic upgrade head`.

## Dashboard data semantics

- `Estimated effort` is an optional per-task value in minutes. The accepted range is 1 to 10,080 minutes.
- `Planned time` uses the estimate when present and otherwise uses the scheduled start/end duration.
- `Completed planned time` is calculated only from completed tasks. It is not actual tracked time because this version does not yet store timer sessions or manual time entries.
- Dashboard trends compare the selected period with the immediately preceding equivalent period. A category filter applies to every KPI and chart, not just the category list.
- General and project statistics share the same contract; the project endpoint additionally enforces project ownership.

## Security notes

- `.env`, `.env.*`, virtual environments, `node_modules`, and `.next` are ignored; `.env.example` stays tracked.
- The API converts only a leading `postgresql://` to `postgresql+psycopg://` at runtime and does not alter credentials/query parameters.
- Auth cookies are HttpOnly and become Secure in production.
- Every planning query is scoped to the authenticated user; task project references are ownership-checked.
- Project notes and project statistics are ownership-checked and return a not-found response for cross-user access.
- Calendar reads are bounded to 62 days and recurring tasks do not create infinite rows.
- Drag-and-drop updates persist through the API. Task-level pending locks prevent duplicate UI mutations, database row locks serialize concurrent updates, and failed optimistic changes roll back.
- Raw database errors and secrets never belong in client responses.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/API.md](docs/API.md), and [docs/AI_INSTRUCTIONS.md](docs/AI_INSTRUCTIONS.md) before extending the system.
