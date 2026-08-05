# syntax=docker/dockerfile:1

# --- Stage: build the React frontend ---
FROM node:24-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- Stage: install production-only Python dependencies ---
FROM python:3.13-alpine AS python-deps

ARG POETRY_VERSION=2.2.1

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# build-base is only needed to build wheels here; it never reaches the runtime stage.
RUN apk add --no-cache build-base \
    && pip install "poetry==${POETRY_VERSION}"

WORKDIR /app

COPY pyproject.toml poetry.lock ./
RUN poetry install --without dev --no-root

# --- Stage: runtime image ---
FROM python:3.13-alpine AS runtime

ARG USERNAME=appuser
ARG USER_UID=10001
ARG USER_GID=${USER_UID}

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:${PATH}" \
    RS_API_STATIC_DIR=/app/frontend_dist

RUN addgroup --gid "${USER_GID}" "${USERNAME}" \
    && adduser --disabled-password --gecos "" --uid "${USER_UID}" --ingroup "${USERNAME}" "${USERNAME}"

WORKDIR /app/backend

COPY --from=python-deps /app/.venv /app/.venv
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY --from=frontend-build /app/frontend/dist /app/frontend_dist

RUN chown -R "${USERNAME}:${USERNAME}" /app

USER ${USERNAME}

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
