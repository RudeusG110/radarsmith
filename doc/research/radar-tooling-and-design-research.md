# Radar tooling and design research

Primary-source investigation into how existing technology-radar tools and the radar
methodology work, used to sanity-check Radarsmith's architecture and MVP tickets. Sources
were read directly (repository source files, W3C Recommendation text, official library
docs) on 2026-07-24, not secondary write-ups. Each claim links the source that owns it.

This note extends [thoughtworks-byor-research.md](./thoughtworks-byor-research.md), which
already covers BYOR input formats and the four-quadrant / four-ring defaults.

## ThoughtWorks Radar methodology

- A radar is a **point-in-time snapshot** of a stance, published on a fixed cadence
  (twice yearly), not a continuously mutated document. Each volume is a distinct edition.
  ([ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar),
  [Radar FAQ](https://www.thoughtworks.com/radar/faq))
- The four rings express decreasing adoption confidence from the center outward —
  **Adopt, Trial, Assess, Hold** — where inner rings are a stronger recommendation.
  ([Radar FAQ](https://www.thoughtworks.com/radar/faq))
- "Movement" is a narrative device: a blip is shown as having moved when its ring differs
  from a **previous edition**. It is derived by comparing two published snapshots, not
  stored as an edit history. ([Radar FAQ](https://www.thoughtworks.com/radar/faq))

## BYOR (build-your-own-radar)

- BYOR is a **renderer over prepared files** (Google Sheets / CSV / JSON), not an editor;
  it holds no persistent edit state.
  ([BYOR README](https://github.com/thoughtworks/build-your-own-radar))
- Config validation requires **exactly 4 quadrants and between 1 and 4 rings**
  (`getQuadrants().length === 4 && isBetween(getRings().length, 1, 4)`). Quadrant and ring
  names default to `['Techniques','Platforms','Tools','Languages & Frameworks']` and
  `['Adopt','Trial','Assess','Caution']` but are overridable via the `QUADRANTS` / `RINGS`
  environment variables.
  ([src/graphing/config.js](https://github.com/thoughtworks/build-your-own-radar/blob/master/src/graphing/config.js))
- The ring formerly named **Hold is now "Caution"**, with backward-compatible acceptance of
  `hold`. (config.js commit
  [7e7b13e "Update ring name hold to caution and maintain backward compat"](https://github.com/thoughtworks/build-your-own-radar/commit/7e7b13ee12a7d5eca9377079e1d0dd470f1683cd))
- Movement is expressed per blip as an optional `status` marker
  (`New` / `Moved In` / `Moved Out` / `No Change`), computed at render time from the input,
  not retained as history. ([BYOR README](https://github.com/thoughtworks/build-your-own-radar))

## Zalando tech-radar (directly relevant to our geometry ticket)

The single-file `radar.js` is the clearest primary source for how a D3 radar actually
places blips. Key facts read from the source
([docs/radar.js](https://github.com/zalando/tech-radar/blob/master/docs/radar.js)):

- **Reproducible placement uses a seeded RNG**, not a truly random one. The file defines a
  custom generator (`var seed = 42; ... Math.sin(seed++) * 10000`) with the comment
  "custom random number generator, to make random sequence reproducible". Each entry is
  positioned in its segment via `random_between(θ)` for angle and `normal_between(r)` for
  radius (center-biased).
- **Overlap is resolved with physics, not with the seed.** After the initial seeded
  placement, a `d3.forceSimulation` with `d3.forceCollide().radius(12)` spreads blips, and
  a per-tick `clipx`/`clipy` (`bounded_ring` + `bounded_box`) clamps every blip back inside
  its quadrant/ring segment.
- Consequence: final positions are reproducible **only when the entry set and its order are
  identical**. The seed is global and entries are numbered sequentially (sorted by label
  within each segment), so adding or removing one blip can reshuffle ids and reflow others.
- Blips are labeled by **number**, not name; the name is shown in a rollover bubble. Shapes
  encode movement: triangle-up = moved in (`moved:1`), triangle-down = moved out
  (`moved:-1`), star = new (`moved:2`), circle = no change.
- Geometry: 4 quadrants (`radial_min`/`radial_max` as multiples of π with x/y sign factors)
  and 4 fixed ring radii `[130, 220, 310, 400]`.
- **License: MIT** (`Copyright (c) 2017-2024 Zalando SE`), so its geometry approach can be
  studied and adapted freely. ([docs/radar.js license header](https://github.com/zalando/tech-radar/blob/master/docs/radar.js))

## Other tools

- **AOE technology-radar** and the **Backstage tech-radar plugin** could not be verified
  from accessible primary sources in this session (AOE repo returned 404; Backstage plugin
  docs were not reachable). No claims are made about them here to avoid citing secondary
  material. Both are widely described as config/file-driven renderers in the BYOR mold, but
  that was not confirmed against a primary source.

## Accessibility: SVG graphics roles (W3C Recommendation)

From the normative **WAI-ARIA Graphics Module 1.0** (W3C Recommendation, 2 Oct 2018,
[w3.org/TR/graphics-aria-1.0](https://www.w3.org/TR/graphics-aria-1.0/)):

- `graphics-document` — the root of a self-contained structured graphic (charts, maps,
  diagrams) "in which the visual appearance or layout of content conveys meaning."
  **Accessible name required.** Recommended fallback form `role="graphics-document document"`.
- `graphics-object` — "a section of a graphics-document that represents a distinct object
  or sub-component with semantic meaning" (may nest). Fallback `role="graphics-object group"`.
- `graphics-symbol` — "a graphical object used to convey a simple meaning or category…
  The symbol itself is an atomic object; children are presentational." **Accessible name
  required.** Fallback `role="graphics-symbol img"`.
- The spec explicitly shows symbols carrying `aria-label` (and `aria-roledescription` for a
  symbol type), with visible text folded into the parent symbol's label because symbol
  children are presentational. (§4.1 role definitions and examples, same source.)

## Typed API client workflow (openapi-typescript / openapi-fetch)

- The documented workflow is: emit the FastAPI OpenAPI document → run **`openapi-typescript`**
  to generate `.d.ts` types → call the API with **`openapi-fetch`**, a tiny typed wrapper
  that infers request/response types from the generated types. It advertises **zero runtime
  type cost** (types are compile-time only) and a single schema as the source of truth.
  ([openapi-ts docs](https://openapi-ts.dev/),
  [openapi-ts/openapi-typescript](https://github.com/openapi-ts/openapi-typescript))
- This matches TICKET-012 exactly; no change needed.

## Alembic seed / data migrations

From the Alembic Operations reference
([alembic .../ops.html](https://alembic.sqlalchemy.org/en/latest/ops.html)):

- **`op.bulk_insert(table, rows)`** is the documented directive for inserting seed rows in a
  migration. `op.create_table(...)` returns a `Table` object "suitable for immediate SQL
  operations, in particular `Operations.bulk_insert()`."
- `op.execute()` accepts raw SQL or Core `insert()`/`update()`/`delete()` constructs for
  more complex data changes.
- For offline (`--sql`) rendering, non-trivial literals must be wrapped in
  `op.inline_literal()` with `multiinsert=False`.
- Idempotence of a seed comes from **Alembic's revision chain / `alembic_version` table**:
  the data migration runs exactly once per database, which is what makes a startup existence
  check unnecessary. (Same source; see also the Cookbook "Data Migrations" section.)

## Design insights and their bearing on the MVP tickets

These are grounded in the sources above. Where they touch a ticket, the ticket id is named.

1. **Deterministic per-blip placement is a deliberate, defensible divergence — keep it.**
   BYOR and Zalando recompute layout on every render (seeded RNG + force simulation), so a
   blip's pixel position is stable only if the whole dataset and its order are unchanged. For
   Radarsmith — an *editor* where blips persist and are edited one at a time — TICKET-019's
   choice to derive position deterministically from **stable blip identity** is the better
   fit: a blip should not jump when a sibling is added or deleted. The research strengthens,
   rather than challenges, that decision.

2. **Determinism and non-overlap can conflict; TICKET-019 should say how it resolves them.**
   Zalando gets non-overlap from `d3.forceCollide`, which is iterative and dataset-global —
   incompatible with per-identity determinism. Radarsmith therefore needs a **deterministic**
   de-overlap strategy (e.g., seed the jitter from the blip UUID, then apply a fixed,
   order-independent spread/relaxation within the sector). Recommend making this explicit in
   TICKET-019's acceptance criteria: "dense sectors avoid marker overlap using only
   identity-seeded, order-independent placement (no physics simulation)."

3. **Name the ARIA graphics roles in TICKET-020.** The ticket asks for "graphic semantics"
   but leaves the roles implicit. Use the authoritative roles: SVG root
   `role="graphics-document"` with an accessible name; each sector group
   `role="graphics-object group"`; each marker `role="graphics-symbol img"` with an
   `aria-label` carrying the blip name and placement. This is a concrete, testable refinement,
   not a scope change.

4. **Do NOT add editions/movement to the MVP.** Both the methodology and the tools model
   movement as a *comparison between two snapshots* (`status` / `moved` markers computed at
   render time), not as an edit log. That is exactly the architecture's stated plan to defer
   history to "immutable editions" (Upgrade 2). The primary sources validate the deferral;
   pulling editions, stored x/y coordinates, or drag-to-move into the MVP would contradict a
   sound scoping decision. No ticket change.

5. **Keep the starter radar's rings BYOR-shaped for later interop.** The starter radar
   (TICKET-011) should use the Adopt / Trial / Assess / Caution ordering (inner = stronger)
   so a future BYOR export/import adapter (Upgrade 3) maps cleanly, including the documented
   `hold → caution` normalization. This is already consistent with the existing byor-research
   note; just flag it when authoring the preload artifact.

6. **The preload approach is confirmed.** `op.bulk_insert` with inline stable UUIDs in one
   Alembic data migration, made idempotent by the revision chain (not a startup check),
   matches both the Alembic docs and architecture.md. The only caution: `bulk_insert` bypasses
   the service layer, so TICKET-011's "validate the artifact with the same domain rules" must
   be a **separate validation step/test over the artifact**, not something the insert performs.

7. **Reuse the BYOR status vocabulary when editions/export land.** When Upgrade 2 (editions)
   and Upgrade 3 (export) are designed, deriving `New / Moved In / Moved Out / No Change` from
   an edition comparison gives free BYOR/Zalando interop. Worth recording now so the edition
   model is designed with that mapping in mind.

## Sources

| Topic | Primary source |
| --- | --- |
| Radar methodology, rings, movement | https://www.thoughtworks.com/radar , https://www.thoughtworks.com/radar/faq |
| BYOR quadrant/ring validation & defaults | https://github.com/thoughtworks/build-your-own-radar/blob/master/src/graphing/config.js |
| BYOR hold→caution rename | https://github.com/thoughtworks/build-your-own-radar/commit/7e7b13ee12a7d5eca9377079e1d0dd470f1683cd |
| BYOR input format & status | https://github.com/thoughtworks/build-your-own-radar |
| Zalando radar geometry, seeded RNG, force layout, license | https://github.com/zalando/tech-radar/blob/master/docs/radar.js |
| ARIA graphics roles | https://www.w3.org/TR/graphics-aria-1.0/ |
| openapi-typescript / openapi-fetch | https://openapi-ts.dev/ , https://github.com/openapi-ts/openapi-typescript |
| Alembic bulk_insert / data migrations | https://alembic.sqlalchemy.org/en/latest/ops.html |

## See also

- [architecture.md](./architecture.md)
- [product-spec.md](./product-spec.md)
- [roadmap.md](./roadmap.md)
- [mvp-tickets.md](./mvp-tickets.md)
- [thoughtworks-byor-research.md](./thoughtworks-byor-research.md)
