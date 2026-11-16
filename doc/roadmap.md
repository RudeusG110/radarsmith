# RadarSmith — Roadmap

Stages are delivered in order. Stage 0 and Stage 1 are broken into issue-ready tickets
(title, short description, acceptance criteria). Later stages are directions only and are
not ticketed until Stage 1 ships.

Sizes: **S** ≈ a day or less, **M** ≈ a few days, **L** ≈ a week or more.

## Stage 0 — Finish the MVP, align conventions, polish

### 0.1 refactor(backend): align layering with report-craft conventions — M

Move the backend to the same layout and naming as report-craft. No behavior change.

- [ ] `app/api/endpoints/` → `app/api/api_v1/endpoints/`; `app/api/api_router.py` → `app/api/api_v1/api.py`
- [ ] `app/api/services/*_service.py` (`RadarService`, `BlipService`) → `app/api/workers/radar.py`, `app/api/workers/blip.py` (`RadarApi`, `BlipApi`)
- [ ] `app/api/api_v1/path_params.py` with `RadarId` / `BlipId` annotated aliases used by the endpoints
- [ ] Multi-step writes in workers use `try: commit` / `finally: rollback` (as in report-craft `ReportApi.unpublish`); single-step CRUD methods may keep committing
- [ ] Exceptions stay in `app/domain/exceptions.py` and the shared error envelope (`{error: {code, message}}`) is unchanged — intentional deviation from report-craft's `core/errors.py` / `{"detail": ...}`
- [ ] OpenAPI output unchanged (types-freshness check passes), all tests green, `architecture.md` updated

### 0.2 fix(api): return the error envelope for unhandled errors — S

Unhandled exceptions return a plain-text 500, which breaks the error contract and makes the
frontend `unwrap()` fail while reading `result.error.error.code`.

- [ ] Catch-all handler returns `500 {error: {code: "internal_error", message}}` and logs the stack trace
- [ ] Framework `HTTPException`s (e.g. unknown `/api/...` path → `{"detail": "Not Found"}`) also use the envelope
- [ ] `IntegrityError` maps to `409 conflict`
- [ ] `unwrap()` tolerates non-envelope error bodies with a generic message
- [ ] Tests cover both handlers and the client fallback

### 0.3 feat(api): unique blip names per radar — S

Duplicate blip names are currently allowed. `ConflictError` and its 409 handler exist but are unused.

- [ ] Case-insensitive duplicate name returns `409 conflict` on create and on rename
- [ ] DB constraint backs the rule; the migration handles existing duplicates
- [ ] Add/Edit forms show the conflict inline on the name field

### 0.4 feat(ui): rename and delete a radar — S/M

Required by the MVP spec; the API already supports it, the UI does not.

- [ ] Rename name and purpose from the library or the workspace
- [ ] Delete asks for confirmation (shows the blip count) and returns to the library
- [ ] Creating, editing, or deleting a blip bumps the radar's `updated_at`; the library shows "last edited"

### 0.5 perf(api): count blips in SQL for the radar list — S

`GET /radars` loads every blip of every radar only to compute `len()`.

- [ ] Blip count comes from an aggregate query; blips are not loaded
- [ ] Query-count test (`tests/lib/query_counter.py`) guards it

### 0.6 test(e2e): Playwright acceptance flow in CI — M

The release checklist depends on a manual run of the MVP acceptance boundary.

- [ ] Automates the five acceptance steps in `product-spec.md` against the Compose stack, including a restart
- [ ] Runs as its own CI job; trace/video uploaded on failure
- [ ] README release checklist references the job instead of the manual run

### 0.7 feat(ui): search and filter blips — S

- [ ] Text search over name and description; filter by quadrant and ring
- [ ] Non-matching markers are dimmed on the radar
- [ ] Empty state with "clear filters"

### 0.8 feat(ui): deep links for mode and selection — S

- [ ] `?mode=edit&blip=<id>` or `&quadrant=<id>` is restored on load and refresh
- [ ] Unknown ids are ignored silently

### 0.9 feat(ui): undo blip delete — S

- [ ] Toast offers "Undo" for ~5 s; the DELETE is only sent after the window closes
- [ ] Navigating away flushes the pending delete

Deferred delete is preferred over re-creating the blip, which would change its id,
`created_at`, and therefore its marker number.

### 0.10 feat(ui): keyboard shortcuts — S

- [ ] `/` search, `n` new blip, `e` toggle edit, `Esc` close, `?` shortcut help
- [ ] Shortcuts are disabled while typing in an input

### 0.11 feat(ui): dark mode — S

- [ ] Follows the OS preference with a persisted manual toggle
- [ ] Ring colors keep WCAG AA contrast in both themes

### 0.12 feat(ui): drag a marker to change placement — M/L (may slip)

- [ ] Dropping a marker into another sector updates quadrant/ring with the same pending/rollback behavior as the table controls
- [ ] The keyboard alternative (table controls) keeps working

### 0.13 chore: repository hygiene — S

- [ ] Remove the stale root `.env` (`PYTHONPATH=./src`) and untrack `frontend/tsconfig.tsbuildinfo`
- [ ] Dependabot for pip, npm, GitHub Actions, and Docker
- [ ] CI `git diff` on the gitignored `backend/openapi.json` is a no-op — drop it or commit the file
- [ ] `architecture.md` links to a `doc/adr/` folder that does not exist — create it or remove the link

Moved out of Stage 0: **tags** (schema, import/export, and editions impact → Stage 2) and
**print layout** (covered by the Stage 1 HTML export).

## Stage 1 — Data in and out

### 1.1 feat(api): export a radar as versioned JSON — M

- [ ] `GET /radars/{id}/export` returns `{format_version, radar, quadrants, rings, blips}`
- [ ] Quadrants and rings are exported in full so Stage 2 templates stay forward-compatible
- [ ] Download action in the workspace

### 1.2 feat(api): import a radar from JSON — M

- [ ] Always creates a **new** radar; never merges into an existing one
- [ ] Uses the same validation as UI-authored data and the preload (`domain/preload/validation.py`)
- [ ] All-or-nothing; file-size and blip-count limits; field-level error messages

### 1.3 feat: standalone HTML export — M

- [ ] Single self-contained file: radar, blip list, glossary
- [ ] No external requests; works offline and as an email attachment
- [ ] Prints cleanly

### 1.4 feat(ui): download the radar as SVG or PNG — S

- [ ] Output matches the on-screen render, including the active theme

### 1.5 (optional) feat: import blips from CSV — S/M

The useful CSV direction is import (leaving a spreadsheet), not export.

- [ ] Columns `name, quadrant, ring, description`; quadrant and ring matched by name, case-insensitive
- [ ] Preview with per-row errors before anything is saved

## Beyond Stage 1 — directions (not ticketed)

| Direction | Summary |
| --- | --- |
| Templates and themes | Quadrant/ring presets (names, count, colors) and export themes; tags. |
| Editions | Publish immutable snapshots; new/moved badges; per-blip timeline; edition comparison. |
| API hardening (pre-auth) | Security headers/CSP, rate and body-size limits, `extra="forbid"`, prod docs off, supply-chain scanning. |
| Distribution | Read-only MCP server, dependency "radar lint" for CI, publish notifications. |
| Suggestions | Separate review inbox fed by a share link; accept creates a blip. |
| Accounts and hardening (post-auth) | Users, ownership, API keys, authz test matrix (BOLA/BFLA), audit log. |
