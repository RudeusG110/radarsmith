# RadarSmith

Forge and maintain your own technology radars. A private, self-hosted web app where the
database is the source of truth for a radar and its blips.

See [doc/architecture](doc/architecture/architecture.md) for the design and
[doc/architecture/mvp-tickets-v2.md](doc/architecture/mvp-tickets-v2.md) for the backlog.

## Layout

```
backend/            Python FastAPI application (package: app)
  app/              application code (api, context, database, models, schemas, log)
  alembic/          database migrations
  tests/            backend tests
frontend/           React + TypeScript + Vite app (built later)
doc/                architecture, product spec, roadmap, tickets, research
```

## Requirements

- Python 3.13 and [Poetry](https://python-poetry.org/)
- Node.js 24 and npm (for the frontend)
- Docker (for PostgreSQL, added in a later ticket)

## Setup

```bash
make setup
```

## Common commands

| Command | Purpose |
| --- | --- |
| `make dev` | Run the API with autoreload on http://localhost:8000/docs |
| `make test` | Run the backend test suite |
| `make lint` | Run Ruff lint checks |
| `make format` | Apply Ruff formatting |
| `make typecheck` | Run Pyright in strict mode |
| `make fe-dev` | Run the frontend dev server on http://localhost:5173 |
| `make fe-test` | Run the frontend test suite (Vitest) |
| `make fe-lint` | Run ESLint |
| `make fe-typecheck` | Run the TypeScript compiler in check-only mode |
| `make build` | Build the production frontend bundle |

The API health check is served at `GET /api/health`. In development the frontend proxies
`/api` to the backend on port 8000.

## Configuration

Backend settings load from `backend/settings.env` (see
[backend/settings.env.template](backend/settings.env.template)). Variables use the
`rs_api_` prefix, e.g. `rs_api_db_url`.
