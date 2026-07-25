# Radarsmith MVP Tickets (v2)

A revised, implementation-ready backlog for the MVP defined in
[product-spec.md](./product-spec.md) and
[architecture.md](./architecture.md). This version keeps the v1 scope and design — which
the primary-source research in
[radar-tooling-and-design-research.md](./radar-tooling-and-design-research.md) validated —
and folds in three refinements it surfaced:

- Deterministic marker placement resolves overlap with an **identity-seeded, order-independent**
  spread, not a physics simulation (TICKET-018).
- The SVG names the authoritative **WAI-ARIA graphics roles** (TICKET-019).
- The starter-radar preload **validates the artifact as a separate step** because
  `bulk_insert` bypasses the service layer (TICKET-011).

## How to read a ticket

- **The first acceptance criterion of every ticket is "Learning notes."** Before writing
  code, capture a short list of the terms, concepts, and resources you need to learn for
  that ticket (a bullet list is enough). This is a real deliverable: it is how you prove you
  understand the work before doing it.
- Backend feature tickets are **vertical slices**: application behavior, persistence, FastAPI
  route, Pydantic schemas, OpenAPI, and focused tests ship together.
- PostgreSQL is used for persistence and integration tests. SQLite is not a substitute.
- The backend is authoritative; frontend state is confirmed or reconciled with API responses.
- A ticket is done only when **every** acceptance criterion is demonstrated.
- Out of MVP scope: editions/movement history, custom structures, import/export,
  authentication, public hosting, and remote deployment.

---

## Foundation

### TICKET-001: Establish the project structure

**Depends on:** Nothing

**Requirements**

- Keep the Python project at the repository root; add the React/TypeScript/Vite app under
  `frontend/`.
- Use Poetry for Python and npm for the frontend.
- Add a FastAPI application factory, a health endpoint, and a backend smoke test.
- Add frontend lint, typecheck, unit-test, and production-build skeletons.
- Add environment templates and `setup`, `dev`, `test`, `lint`, `typecheck`, `build` targets.
- Document setup and commands in the README.

**Acceptance criteria**

- **Learning notes:** capture what you need to learn — roles of Poetry vs npm, FastAPI
  application factory pattern, Vite dev server vs build, `pyproject.toml`, health endpoints,
  monorepo layout. Resources: FastAPI "First Steps", Vite "Getting Started", Poetry basics.
- A fresh checkout can be set up with the documented non-interactive commands.
- The API health test and frontend smoke test pass.
- Lint, typecheck, test, and build run independently.
- Generated artifacts, local envs, and secrets are Git-ignored.
- No global npm package or host PostgreSQL install is required.

### TICKET-002: Run local PostgreSQL with Docker Compose

**Depends on:** TICKET-001

**Requirements**

- Add a development Compose service using a pinned PostgreSQL major version, a health check,
  a named data volume, and development-only credentials.
- Provide environment-based database settings to FastAPI and tests.
- Add `db-up`, `db-down`, and a deliberately destructive `db-reset` target.
- Keep FastAPI and Vite on the host for hot reload.

**Acceptance criteria**

- **Learning notes:** capture terms to learn — image vs container, port mapping, named
  volumes vs bind mounts, health checks, stopping a container vs deleting its volume,
  connection URLs. Resources: Docker Compose file reference, Postgres official image docs.
- One documented command starts a healthy PostgreSQL container.
- FastAPI and tests connect through the configured database URL.
- Restarting the container preserves data; `db-reset` recreates a clean database.
- Credentials are marked unsuitable for production; credentials and volumes are not committed.

### TICKET-003: Define and migrate the initial schema

**Depends on:** TICKET-001, TICKET-002

**Requirements**

- Add SQLAlchemy models and Alembic configuration.
- Create `radar`, `quadrant`, `ring`, and `blip` tables with UUID primary keys, timestamps,
  foreign keys, deletion cascades, and unique structure-position constraints per radar.
- Make blip name and description required; store descriptions as plain text.
- Add documented migration commands.

**Acceptance criteria**

- **Learning notes:** capture terms — SQLAlchemy model vs DB schema vs Alembic migration,
  foreign keys, unique constraints, cascade delete, `upgrade`/`downgrade`, why startup must
  not silently alter schema. Resources: SQLAlchemy ORM quickstart, Alembic tutorial.
- Upgrading an empty database creates the complete schema; downgrading succeeds in a test DB.
- Constraints cover foreign keys, required values, and unique structure positions.
- Migration tests run against PostgreSQL.
- No movement, edition, user, owner-scope, or visibility column exists.

---

## Backend vertical slices

### TICKET-004: Create a radar with the default structure

**Depends on:** TICKET-003

**Requirements**

- Add create-radar repository and application-service behavior.
- Add a Pydantic request with required name and optional purpose.
- Atomically create the radar plus four default quadrants and four default rings, using the
  Adopt/Trial/Assess/Caution ring order (inner = stronger) for later BYOR interop.
- Expose `POST /api/radars` and document it in OpenAPI.

**Acceptance criteria**

- **Learning notes:** capture terms — application service vs repository vs route, aggregate
  creation, transaction boundaries, why a partially created radar must never be visible,
  Pydantic request models. Resources: FastAPI request-body docs, SQLAlchemy session/transaction docs.
- Valid input returns the complete persisted radar with deterministic ordered structure.
- Name is nonblank; purpose may be omitted.
- Quadrant and ring positions are unique within the radar.
- Any structure-creation failure rolls back the whole transaction.
- The application service has no FastAPI dependency.
- PostgreSQL service tests and route integration tests pass.

### TICKET-005: List radars and load a complete radar

**Depends on:** TICKET-004

**Requirements**

- Add list-radars and get-radar queries.
- Return a lightweight list item from `GET /api/radars`.
- Return one radar with ordered quadrants, rings, and blips from
  `GET /api/radars/{radar_id}`.
- Add Pydantic response schemas and OpenAPI documentation.

**Acceptance criteria**

- **Learning notes:** capture terms — query/read models, deterministic ordering, eager
  loading, the N+1 query problem, typed outcomes → HTTP responses. Resources: SQLAlchemy
  loading-techniques docs (`selectinload`/`joinedload`).
- An empty database returns an empty list.
- Radar lists and nested structure use deterministic ordering.
- Loading a radar returns complete data without duplicate rows.
- An unknown ID produces the shared typed not-found response.
- A query-count regression test prevents per-blip N+1 loading.
- PostgreSQL query tests and route integration tests pass.

### TICKET-006: Edit and delete radar metadata

**Depends on:** TICKET-004, TICKET-005

**Requirements**

- Add update behavior for radar name and purpose via a Pydantic partial-update schema.
- Add radar deletion scoped by radar ID (hard delete for the MVP).
- Expose `PATCH /api/radars/{radar_id}` and `DELETE /api/radars/{radar_id}`; update OpenAPI.

**Acceptance criteria**

- **Learning notes:** capture terms — PATCH semantics, omitted vs explicit-null fields,
  where input/domain/persistence validation belongs, DB cascade vs ORM cascade, hard vs soft
  delete. Resources: JSON Merge Patch concept, Pydantic `exclude_unset`.
- PATCH can update either or both editable fields; omitted fields are unchanged; the name
  stays nonblank; purpose can be explicitly cleared; `updated_at` changes only on success.
- Deleting a radar removes its quadrants, rings, and blips; other radars are untouched.
- Unknown IDs produce the shared typed not-found response; persistence failures roll back.
- Service tests and route integration tests pass.

### TICKET-007: Add and edit a blip

**Depends on:** TICKET-004, TICKET-005

**Requirements**

- Add blip create and partial-update behavior (name, description, quadrant ID, ring ID).
- Require name, description, quadrant, and ring on create; allow any subset on update.
- Enforce that quadrant and ring belong to the requested radar and the blip belongs to it.
- Treat repositioning as a current-state update (no history row). Allow repeated blip names.
- Expose `POST /api/radars/{radar_id}/blips` and
  `PATCH /api/radars/{radar_id}/blips/{blip_id}`; update OpenAPI.

**Acceptance criteria**

- **Learning notes:** capture terms — Pydantic input schema vs SQLAlchemy model, structural
  vs stateful validation, stable identity, current state vs historical events, atomic
  multi-field updates. Resources: Pydantic validators, FastAPI path-parameter docs.
- Name and plain-text description are required and nonblank on create.
- The radar, quadrant, and ring exist and the quadrant/ring belong to the radar.
- Content-only, placement-only, and combined updates persist atomically; failures leave the
  blip unchanged; `updated_at` changes after a successful mutation.
- Valid create persists atomically and returns a complete blip with a stable UUID.
- PostgreSQL service tests and route integration tests pass.

### TICKET-008: Delete a blip

**Depends on:** TICKET-007

**Requirements**

- Add blip deletion scoped by both radar ID and blip ID.
- Expose `DELETE /api/radars/{radar_id}/blips/{blip_id}`; update OpenAPI.

**Acceptance criteria**

- **Learning notes:** capture terms — nested-resource identity, strict vs idempotent delete
  semantics, transaction rollback, MVP hard deletion. Resources: REST nested-resource
  conventions, HTTP 404 vs 204.
- An existing blip is removed; a blip cannot be deleted through another radar.
- Unknown radar or blip produces the shared typed not-found response.
- Other blips and radar structure remain unchanged; persistence failures roll back.
- PostgreSQL service tests and route integration tests pass.

### TICKET-009: Expose one consistent API error shape and OpenAPI contract

**Depends on:** TICKET-005, TICKET-007

**Requirements**

- Return one machine-readable error shape for validation, missing resources, and conflicts.
- Add a repeatable command that exports the FastAPI OpenAPI document.
- Ensure every endpoint documents its success and error responses.

**Acceptance criteria**

- **Learning notes:** capture terms — FastAPI exception handlers, `HTTPException`, OpenAPI
  document structure, error envelopes, status-code semantics (400/404/409/422). Resources:
  FastAPI "Handling Errors" docs.
- All endpoints share one error envelope with a stable, documented structure.
- Validation, not-found, and conflict cases each map to the correct status and envelope.
- The OpenAPI export command is deterministic and documented.
- Route integration tests assert the error shape across representative failures.

### TICKET-010: Preload the editable starter radar once

**Depends on:** TICKET-003

**Requirements**

- Convert the existing extracted data into a versioned local preload artifact with stable
  radar and blip UUIDs.
- Insert it through an Alembic **data migration** (`op.bulk_insert`), performing no network
  access at migration time or startup.
- Because `bulk_insert` bypasses the service layer, validate the artifact against the same
  domain rules in a **separate validation step/test**, not during the insert.

**Acceptance criteria**

- **Learning notes:** capture terms — schema vs data migration, `op.bulk_insert` /
  `op.execute` / `inline_literal`, why the `alembic_version` revision chain (not a startup
  check) guarantees run-once, product seed data vs test fixtures. Resources: Alembic ops
  reference and Cookbook "Data Migrations".
- An empty database receives one complete, editable starter radar; the migration is
  deterministic and atomic.
- Restarts and upgrades neither duplicate the radar nor overwrite edits; deleting it does not
  make it reappear.
- Malformed preload data fails validation without leaving partial rows.
- Migration tests cover initial insertion and the post-edit / post-delete lifecycle.

---

## Frontend foundation and authoring

### TICKET-011: Establish the typed browser-to-API connection

**Depends on:** TICKET-001, TICKET-005, TICKET-007, TICKET-008, TICKET-009

**Requirements**

- Generate committed TypeScript API types with `openapi-typescript` from the exported OpenAPI
  document.
- Use `openapi-fetch` for typed HTTP calls; add shared API-error and network-error handling.
- Configure the dev server to reach `/api` without hardcoded production hostnames.

**Acceptance criteria**

- **Learning notes:** capture terms — OpenAPI as a contract, `openapi-typescript` vs
  `openapi-fetch`, compile-time vs runtime types, `fetch`/promises/async-await, loading vs
  error state, the browser Network panel. Resources: openapi-ts.dev docs.
- Type generation is deterministic and documented; CI can detect stale generated types.
- Frontend code does not hand-duplicate backend DTOs.
- A frontend test calls a mocked radar endpoint with compile-time request/response types.
- Structured API errors and network failures stay distinguishable; the frontend builds
  without a running backend.

### TICKET-012: Build the radar library (list and create)

**Depends on:** TICKET-010, TICKET-011

**Requirements**

- Implement `/radars` using the real list API: show each radar's name and purpose and link to
  its workspace, with loading, empty, and retryable error states.
- Add a New Radar action and form (required name, optional purpose) that submits through the
  typed client and opens the new workspace after confirmation.

**Acceptance criteria**

- **Learning notes:** capture terms — React components/props/state, server-state loading,
  routing, list rendering, controlled inputs, pending state, focus after error/navigation,
  optimistic vs server-confirmed mutations. Resources: React "Thinking in React", router docs.
- The bundled radar appears through the real API; keyboard and pointer users can open a radar.
- Invalid create input is explained accessibly; pending state prevents duplicate submission;
  server errors preserve entered values and permit retry; cancel changes nothing.
- Empty, loading, success, and error states have component coverage across narrow/wide layouts.

### TICKET-013: Display the read-only blip table

**Depends on:** TICKET-011, TICKET-012

**Requirements**

- Implement `/radars/{radar_id}` using the complete-radar API.
- Show radar name, purpose, structure labels, and a blip table with name, quadrant, ring, and
  access to the description.

**Acceptance criteria**

- **Learning notes:** capture terms — route parameters, semantic HTML tables, derived display
  data, responsive overflow, accessible loading/empty/not-found/retry states. Resources:
  MDN table semantics, WAI table tutorials.
- Data comes from the real API and rows are deterministic.
- The table is understandable to keyboard and screen-reader users.
- Long content does not break representative mobile/desktop layouts.
- Loading, empty, not-found, success, and error states have component coverage.

### TICKET-014: Add, edit, and delete a blip from the workspace

**Depends on:** TICKET-013

**Requirements**

- Add an Add/Edit Blip drawer with name, description, and quadrant/ring select controls that
  map stored IDs to visible names.
- Send only dirty fields on edit; submit through the typed client and show server-confirmed
  results.
- Add a Delete action with an accessible confirmation dialog naming the blip; remove the row
  only after server confirmation.

**Acceptance criteria**

- **Learning notes:** capture terms — native select controls and labels, drawer focus
  entry/containment/return, server state vs form draft, dirty fields, PATCH payloads,
  rollback, accessible dialog semantics, pessimistic delete. Resources: WAI-ARIA APG dialog
  and combobox/listbox patterns.
- Every field has an accessible label and explicit initial selection; pending state prevents
  duplicate submission; API errors preserve the draft and last confirmed values with retry.
- Content-only, placement-only, and combined edits work; save is disabled when nothing changed.
- Cancel discards the draft and restores focus; new/edited rows persist after reload.
- Delete confirmation names the blip; success closes the drawer, removes the row, and restores
  focus; failure keeps the blip visible with retry.
- Component tests cover success, error, and keyboard/screen-reader behavior.

---

## Radar visualization

### TICKET-015: Calculate deterministic radar geometry

**Depends on:** TICKET-001

**Requirements**

- Implement pure TypeScript geometry functions for sectors, rings, labels, and markers,
  accepting arbitrary ordered quadrant/ring data (never assuming four-by-four).
- Place markers deterministically from **stable blip identity** (e.g., a UUID-seeded jitter),
  and resolve dense-sector overlap with an **order-independent** spread — no physics
  simulation, so a blip does not move when a sibling is added or removed.

**Acceptance criteria**

- **Learning notes:** capture terms — SVG coordinates and `viewBox`, polar/Cartesian
  conversion, arcs/sectors/radii, deterministic pseudo-random from a seed, why iterative
  force layout breaks per-identity determinism, property-based testing. Resources: the Zalando
  `radar.js` geometry (studied, not copied) noted in the research file; D3 shape/scale utils.
- Identical input always returns identical coordinates.
- Every marker lies within its assigned sector and ring.
- Empty and dense sectors are supported; dense sectors avoid overlap using only
  identity-seeded, order-independent placement.
- Geometry scales correctly with dimensions.
- Unit and property tests cover boundaries and representative datasets; no React/DOM code.

### TICKET-016: Render the accessible radar SVG

**Depends on:** TICKET-013, TICKET-015

**Requirements**

- Draw rings, sector boundaries, labels, and compact numbered markers from geometry output.
- Apply WAI-ARIA graphics roles: SVG root `role="graphics-document"` with an accessible name;
  sector groups `role="graphics-object group"`; markers `role="graphics-symbol img"` with an
  `aria-label` carrying the blip name and placement.
- Show full selected/hovered/focused blip details outside the SVG; safely turn URLs in
  displayed descriptions into links (no arbitrary HTML). Keep the renderer read-only.

**Acceptance criteria**

- **Learning notes:** capture terms — SVG elements and responsive `viewBox`, React array
  rendering, WAI-ARIA Graphics Module roles and required accessible names, focus/tooltips,
  visual vs accessible labels, safe plain-text URL linkification. Resources:
  w3.org/TR/graphics-aria-1.0 (roles and examples).
- Every blip produces exactly one marker; the SVG scales without clipping and has a
  meaningful empty state.
- The root, sectors, and markers expose the correct graphics roles and accessible names;
  markers are keyboard focusable.
- Linkification does not interpret arbitrary HTML.
- Representative dense-data component/snapshot tests pass.

### TICKET-017: Compose the responsive linked workspace

**Depends on:** TICKET-014, TICKET-016

**Requirements**

- Show radar and table together on wide screens and as Radar/Blips tabs on narrow screens.
- Synchronize row and marker selection in both directions and preserve selection across view
  switching and resizing.

**Acceptance criteria**

- **Learning notes:** capture terms — shared React state, refs/focus management, media
  queries, accessible tabs, responsive component testing. Resources: WAI-ARIA APG tabs pattern.
- Pointer and keyboard selection work from either surface; selecting a row highlights/focuses
  its marker and vice versa.
- Selected details stay visible across responsive modes; controls and text do not overlap at
  target viewports; long names fit without shifting fixed-format controls.
- Component tests cover tabs, selection, and resize behavior.

---

## Delivery

### TICKET-018: Package and run the private production stack

**Depends on:** TICKET-009, TICKET-017

**Requirements**

- Add a multi-stage Dockerfile that builds the React assets and installs production Python
  dependencies, serving frontend and FastAPI from one image and port as a non-root user with a
  health check; add `.dockerignore`.
- Add a deployment Compose file with application and PostgreSQL services, a one-shot migration
  job before app start, a named data volume, external secrets/settings, and binding to
  `127.0.0.1` by default. No TLS/reverse proxy/Postgres-in-image.

**Acceptance criteria**

- **Learning notes:** capture terms — image vs container, Dockerfile layers/cache,
  build vs runtime stages, non-root/PID 1/signals, Compose service DNS, one-shot jobs,
  volumes, restart policies, backup/restore. Resources: Docker multi-stage build docs,
  Compose deployment guidance.
- A clean build is reproducible from lockfiles; the container starts healthy and serves UI and
  API under one origin; SIGTERM stops it cleanly.
- One documented command starts a clean healthy stack; migrations finish before the app starts;
  the app reaches PostgreSQL by service name; restarts retain edits.
- No secret is stored in the image or committed Compose configuration.

### TICKET-019: Prove the core journey end to end

**Depends on:** TICKET-010, TICKET-012, TICKET-017, TICKET-018

**Requirements**

- Automate the product-spec acceptance journey in a real browser at desktop and mobile
  viewports: open the bundled radar, create a second radar, add/edit/move a blip, observe live
  changes, restart, and confirm state without duplicating or resetting the bundled radar.
- Include accessibility checks and screenshots for the library and workspace.

**Acceptance criteria**

- **Learning notes:** capture terms — end-to-end vs component tests, browser automation
  (Playwright), viewport emulation, accessibility assertions, flaky-test avoidance. Resources:
  Playwright "Getting Started" and assertions docs.
- The journey passes at representative desktop and mobile sizes.
- Accessibility checks pass and screenshots are captured.
- The SVG is nonblank, all expected markers exist, and no controls overlap.
- Restart shows the same state with the bundled radar neither duplicated nor reset.

### TICKET-020: Add CI and prepare the release

**Depends on:** TICKET-019

**Requirements**

- Add GitHub Actions running on PRs and pushes to main: backend lint, strict typecheck, and
  pytest with a PostgreSQL service; frontend lint, typecheck, unit tests, and build; migration
  upgrade/downgrade; a check that generated OpenAPI types are current; and a production image
  build without publishing. Pin action versions; use read-only default permissions.
- Document local install, upgrade, backup, restore, and troubleshooting; record supported
  browser and PostgreSQL versions; tag the release only after the acceptance boundary is met.

**Acceptance criteria**

- **Learning notes:** capture terms — CI vs CD, workflow/job/step/trigger/runner, service
  containers, caching, artifacts, branch protection, supply-chain pinning, semantic-version
  tags. Resources: GitHub Actions docs, `actions/setup-*` and service-container examples.
- Each check fails independently with readable logs; lockfile changes invalidate relevant
  caches; PRs need no repository secret.
- Documented local commands reproduce CI checks; a failed check blocks success.
- Install/upgrade/backup/restore/troubleshooting docs are complete; the release is tagged only
  after the MVP acceptance boundary is fully demonstrated.

## Post-MVP upgrades

### Upgrade 1 — Custom radar structures and richer editing

- Edit quadrant and ring names, order, and count with rules for occupied structure.
- Offer multiple empty templates.
- Add optional drag-to-reposition while retaining accessible form controls.
- Evaluate richer descriptions and structured links separately from blip relationships.

### Upgrade 2 — Editions and change history

- Introduce a mutable draft and immutable finalized editions.
- Compare an edition to its predecessor to derive added, removed, renamed, and repositioned
  blips.
- Add an edition timeline and comparison overlay.
- Define the constrained workflow for reopening or correcting the latest edition.

### Upgrade 3 — Import and export

- Import BYOR/CSV through the same validated authoring commands used by the UI.
- Export current radars and later edition comparisons to BYOR-compatible JSON and CSV.
- Add mapping/review UX for unknown or conflicting structure names.
- Keep network fetching and recurring synchronization separate from file interchange.
- CLI support: For instance radarsmith forge/validate --file file/location/file.json --template option1/2/3 (your own template)
  - --output (output option i.e. pdf)
  - --share

### Upgrade 4 — Accounts, sharing, and collaboration

- Add authentication, users, radar ownership, memberships, and permissions as one model.
- Support private and shared radars plus public read-only links.
- Define concurrent editing and audit expectations before enabling multiple authors.
- Add an internet-facing deployment profile only when these controls exist.

### Upgrade 5 — Feeds and suggestions

- Ingest RSS/Atom items as candidates rather than authoritative blips.
- Review, accept, reject, and deduplicate candidates.
- Add a provider-neutral classification interface and bring-your-own-model adapters.
- Never allow a feed or model to bypass human review.

### Upgrade 6 — Relationships, growth, and reach

- Model explicit relationships such as "builds on" and "adjacent to" between blips.
- Build growth or skill-map views on editions and relationships.
- Explore ranking, personal tracks, digests, chat/search, and read tracking only after the
  underlying user and history models exist.


---

## See also

- [architecture.md](./architecture.md)
- [product-spec.md](./product-spec.md)
- [roadmap.md](./roadmap.md)
- [mvp-tickets.md](./mvp-tickets.md) — the v1 backlog this revises.
- [radar-tooling-and-design-research.md](./radar-tooling-and-design-research.md) — the
  primary-source findings behind the v2 refinements.
