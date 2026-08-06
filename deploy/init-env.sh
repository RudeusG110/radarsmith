#!/usr/bin/env bash
# Idempotent: create deploy/.env from the template with a generated Postgres password,
# but never touch it if it already exists (manual edits are preserved).
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_file="${script_dir}/.env"
template_file="${script_dir}/.env.template"

if [[ -f "$env_file" ]]; then
  exit 0
fi

# Hex-only output needs no URL-encoding when embedded in the rs_api_db_url DSN.
# Prefer openssl; fall back to /dev/urandom for hosts without it installed.
if command -v openssl >/dev/null 2>&1; then
  password="$(openssl rand -hex 24)"
else
  password="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
fi

sed \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${password}|" \
  -e "s|^rs_api_db_url=postgresql+psycopg://radarsmith:@db:5432/radarsmith|rs_api_db_url=postgresql+psycopg://radarsmith:${password}@db:5432/radarsmith|" \
  "$template_file" > "$env_file"

echo "Created deploy/.env with a generated PostgreSQL password."
