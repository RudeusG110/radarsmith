# Restyle decisions (post TICKET-025 follow-up debate)

Context: after TICKET-025 (Edit mode restyle) plus five adjacent styling TODOs shipped, manual
testing surfaced real gaps against [flow-5-view-edit-concept.html](./flow-5-view-edit-concept.html)
and [flow-4-prototype-final.html](./flow-4-prototype-final.html). This file records what we
debated and agreed, so it can be worked from a TODO list without re-litigating each point.

No CSS framework (Bootstrap etc.) is being introduced anywhere in this pass — everything below
extends the existing token system in `frontend/src/index.css` (from TICKET-021).

## 1. Persistent top toolbar

- Add a real `<header>` present on every route (currently `App.tsx` has none): a logo (placeholder
  glyph is fine) + "RadarSmith" brand button that navigates to `/radars`, a breadcrumb
  (`/ {radar name}`) shown only inside a workspace, and the View/Edit mode toggle.
- Mode toggle stays **top-right** in the toolbar (flow-5's placement) — not centered.
- This replaces the `.workspace-header` "← Back to radar library" link added in the previous
  TODO 3 — remove it; the persistent logo/brand link supersedes it.
- The toolbar sits outside `<main>`, like flow-5's `header.topbar`.

## 2. Radar library (`/radars`)

- Match flow-5's `.radar-card`/`.lib-head` tokens more precisely (text color, borders).
- Add `blip_count` to the backend `RadarSummaryOut` schema (small API addition) and show
  "N blips" on each card, matching flow-5's `.meta`.
- Add a "Start here" tag + pin-to-top for the preloaded/starter radar. There is no `bundled`/
  `is_starter` flag in the schema or DB — agreed to identify it in the **frontend only**, via a
  hardcoded constant for its known, stable UUID (it's deterministic per the TICKET-010 preload
  migration). This is a frontend-only heuristic, not a backend change.

## 3. Starter radar rename

- Current: `name = "Technology Radar"`, `purpose` already reads "Starter radar preloaded from the
  Thoughtworks Technology Radar, Volume 34 (April 2026)."
- Agreed new name: **"Thoughtworks Technology Radar — Volume 34"**. Purpose text stays as-is
  (still useful — it carries the April 2026 date the name doesn't).
- Mechanics (confirmed against `backend/scripts/build_preload.py`):
  1. Edit the `RADAR_NAME` / `RADAR_PURPOSE` constants in `build_preload.py`.
  2. Regenerate: `poetry run python -m scripts.build_preload` (from `backend/`) — rewrites
     `starter_radar_v1.json`. The radar's UUID is seeded from a fixed namespace, not the name, so
     it does not change.
  3. Locally: `make db-reset` (wipes the dev DB volume) then `make up-schema` (runs all
     migrations fresh, including the preload insert).
  - Note: `build_preload.py` documents "once shipped, `starter_radar_v1.json` is frozen; future
    changes ship as a new versioned artifact." We're editing v1 in place anyway because nothing
    has been released yet — this is a deliberate, agreed exception, made before the frozen
    convention is ever exercised for real, not a precedent for editing shipped artifacts later.
  - No test hardcodes the old name/purpose text, so no test changes are required.

## 4. Radar sizing — go big now, refine responsive later

- The `max-width: 560px` cap on `.radar-svg` (added for the "radar too big" bug) was too
  conservative once seen next to the mockups. Agreed: make the radar dominate the page now with
  larger, approximate proportions (bigger cap, or column-driven sizing giving the radar most of
  the width). Full responsive/breakpoint polish across all viewport sizes is separate, later work
  — don't let that block making it feel right at a normal desktop width today.

## 5. Radar panel chrome (reverses an earlier call)

- Wrap the radar SVG itself in `.panel radar-wrap` (with a "Radar" `.panel-title`) in **both**
  View and Edit mode, matching flow-5's `.panel.radar-panel` / `.panel` treatment. This reverses
  the TODO 2/4 decision to leave the SVG bare "for literal consistency with View mode's existing
  (unwrapped) implementation" — now that we're deliberately changing View mode too, that
  constraint no longer applies.

## 6. Quadrant/ring label z-order (a real bug, not a style call)

- Quadrant/ring sector boundary lines and labels are currently drawn sector-by-sector in one
  pass, so a later sector's boundary line can paint over an earlier sector's label (SVG paints in
  document order). Fix: render **all** boundary lines first, then **all** labels in a second
  pass, so every label paints above every line.

## 7. Compact quadrant/ring glossary

- Replace the removed `<dl>` (Quadrants: ...; Rings: ...) text block with a compact, properly
  aligned glossary positioned **below the radar SVG, inside the radar panel** — not a full-width
  page footer. Applies to both View and Edit mode, since it belongs to the radar panel itself.
- Exact visual treatment (chips vs. simple list) is an implementation detail to get right when
  built, not something that needed further debate.

## 8. Description display in Edit mode's bottom panel

- `BlipDetailPanel` is shared between View mode's side panel and Edit mode's bottom panel.
  Agreed: drop the description paragraph **only** from Edit mode's usage (add a `showDescription`
  prop, default `true`, pass `false` from Edit mode). View mode keeps full detail including
  description — it's the only read surface there, with no edit form to fall back on.
- How description should ultimately be surfaced in Edit mode (table hover/expand/show-more) is
  explicitly **deferred** — "we will see how to style it later." Nothing to build for it now
  beyond removing it from the bottom panel.

## 9. Blip table interaction fixes

- Clicking anywhere in a table row selects/deselects it (not just the name button); Edit/Delete
  actions must stop propagation so they don't also toggle selection.
- Fix Edit/Delete button spacing (currently touching, no gap) — moot for "Edit" once section 10
  lands (its button goes away), but Delete's spacing/touch-target still needs fixing generally.

## 10. Blip edit model — Option C2 (supersedes the separate Edit drawer, not ADR-0001's save semantics)

This reopens [0001-keep-batched-drawer-editing-for-now.md](../adr/0001-keep-batched-drawer-editing-for-now.md)'s
territory but does **not** reverse its actual decision. ADR-0001 rejected *instant per-field
autosave* (flow-4's model) because save granularity is entangled with the undesigned post-MVP
editions/draft model. We are keeping single, explicit, batched Save/Cancel — nothing here
becomes instant. What changes is presentation, not save semantics:

- Remove the separate row-level "Edit" button and the `EditBlipDrawer` modal dialog.
- Selecting a blip (row or marker) shows an **always-visible, inline editable panel** in Edit
  mode's bottom panel slot: Name input, Quadrant dropdown, Ring dropdown, Description textarea,
  with one Save button (disabled until the draft differs from the last-saved blip, exactly like
  today's dirty-tracking) and a Cancel button (reverts the draft, keeps the blip selected).
- Selecting a dropdown option only updates local draft state — identical mechanics to today's
  `EditBlipDrawer`, just inline instead of in a modal. This directly answers "how do we save a
  dropdown pick" — we don't, until Save is clicked.
- **Add Blip stays a modal** (`AddBlipDrawer`, unchanged) — there's no selected blip to attach an
  inline form to when creating one.
- **Delete stays a row-level action** with its existing confirm dialog (`DeleteBlipDialog`),
  independent of the inline edit panel, for now.
- No blip selected → bottom panel shows a neutral placeholder (e.g. "Select a blip to view or
  edit its details.").

## 11. Form sizing bugs (uncontested, just bugs)

- `<textarea>` (Add/Edit blip description) has no `rows` attribute, defaulting to the browser's
  native 2 rows — add an explicit `rows` value.
- Form action buttons (Save/Cancel, previously Edit/Delete) render with no gap and visually
  touch — add spacing between adjacent form/row action buttons wherever this occurs.

## Explicitly deferred (not in this pass)

- Full responsive/breakpoint design for the radar at all viewport sizes (section 4).
- Final visual treatment for surfacing blip descriptions outside the edit form/View mode panel
  (section 8) — hover, expand, or show-more in the table.
