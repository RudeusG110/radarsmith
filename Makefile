.PHONY: setup dev test lint format typecheck build db-up db-down db-reset \
	fe-setup fe-dev fe-test fe-lint fe-typecheck fe-build


COMPOSE_FILE := dev/docker-compose.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)

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

db-up:
	$(COMPOSE) up -d db

db-down:
	$(COMPOSE) down

db-reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d db

up-schema:
	cd backend && alembic -c alembic/alembic.ini upgrade head

down-schema:
	cd backend && alembic -c alembic/alembic.ini downgrade -1

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

# --- Combined ---
build: fe-build
