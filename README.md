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
## Database upgrade
Modify the database model accordingly to your specification. Change to the backend folder in your terminal and run the commands bellow:

```
alembic -c alembic/alembic.ini revision -m "<add your own comment>" --autogenerate
```

You should see a new file in alembic/versions folder.
It should contain the code for upgrading and downgrading db table based on the changes you have made in the model. You will probably get code styles warnings in this file. Fixed them, if you can.
Next, run the following command:

```bash
make up-schema
```

This will upgrade your db table. To verify that everything works correctly, downgrade alembic version by running the following commands (downgrades by one version):

```bash
make down-schema
```

If this works accordingly, run the following command again to upgrade to the latest alembic version:

```bash
make up-schema
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
| `make db-up` | Db up |
| `make db-down` | Db down |
| `make db-reset` | Db down and up |
| `make up-schema` | Upgrade schema to head |
| `make down-schema` | Downgrade schema by one version |

The API health check is served at `GET /api/v1/health`. In development the frontend proxies
`/api/v1` to the backend on port 8000.

## Configuration

Backend settings load from `backend/settings.env` (see
[backend/settings.env.template](backend/settings.env.template)). Variables use the
`rs_api_` prefix, e.g. `rs_api_db_url`.
