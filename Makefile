.PHONY: setup dev test lint format typecheck build db-up db-down db-reset export-openapi \
	fe-setup fe-dev fe-test fe-lint fe-typecheck fe-build fe-generate-types generate-api-types \
	prod-up prod-down


COMPOSE_FILE := dev/docker-compose.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)

PROD_COMPOSE_FILE := deploy/docker-compose.yml
PROD_ENV_FILE := deploy/.env
PROD_COMPOSE := docker compose -f $(PROD_COMPOSE_FILE) --env-file $(PROD_ENV_FILE)

# --- Setup ---
setup:
	poetry install
	cd frontend && npm install

# --- Backend ---
dev:
	cd backend && poetry run uvicorn app.main:app --reload --port 8000

test:
	poetry run pytest

lint:
	poetry run ruff check .

format:
	poetry run ruff format .

typecheck:
	poetry run pyright

# Export the OpenAPI document deterministically to backend/openapi.json
export-openapi:
	cd backend && poetry run python -m scripts.export_openapi

# Database commands for managing the PostgreSQL database using Docker Compose
db-up:
	$(COMPOSE) up -d db

db-down:
	$(COMPOSE) down

db-reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d db

# Alembic commands for database schema migrations
up-schema:
	cd backend && poetry run alembic -c alembic/alembic.ini upgrade head

down-schema:
	cd backend && poetry run alembic -c alembic/alembic.ini downgrade -1

# --- Frontend ---
fe-setup:
	cd frontend && npm install

fe-dev:
	cd frontend && npm run dev

fe-test:
	cd frontend && npm run test

fe-lint:
	cd frontend && npm run lint

fe-typecheck:
	cd frontend && npm run typecheck

fe-build:
	cd frontend && npm run build

# Regenerate the committed TypeScript types from backend/openapi.json
fe-generate-types:
	cd frontend && npm run generate-types

# Re-export the OpenAPI document and regenerate frontend types from it in one step.
# CI runs this and diffs the result against the committed file to catch stale types.
generate-api-types: export-openapi fe-generate-types

# --- Combined ---
build: fe-build

# --- Production stack (see deploy/docker-compose.yml) ---
# File target: only regenerates deploy/.env when it doesn't already exist.
$(PROD_ENV_FILE):
	./deploy/init-env.sh

prod-up: $(PROD_ENV_FILE)
	$(PROD_COMPOSE) up -d --build

prod-down:
	$(PROD_COMPOSE) down

