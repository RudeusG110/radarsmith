# Radarsmith — Product Spec

## One sentence

A private, self-hosted web app for creating and maintaining technology radars through a
practical editor with a live radar visualization.

## The problem

Existing open radar tools are good at rendering prepared files, but weak at maintaining
the radar itself. Authors fall back to spreadsheets or CSV files, then repeat an
export-and-render cycle whenever a blip changes.

Radarsmith makes the database the source of truth. An author opens a radar, edits its
blips in the browser, and immediately sees the resulting radar without preparing an
intermediate file.

## Product intent

A radar is a **positioning tool**. It records an author's current stance on a set of
technologies or practices by placing each blip in a quadrant and ring. The first release
is about making that stance easy to create, inspect, and maintain; it is not yet a
publishing, collaboration, or discovery product.

## MVP user and delivery model

The MVP serves one trusted author in a private, self-hosted installation. It has no
accounts, permissions, or public links and must not be exposed directly as a public
multi-user service.

The application ships through Docker Compose with PostgreSQL and includes one radar
prepared from existing project data. On an empty database, that radar is seeded once and
then behaves like ordinary user-owned data: it is editable and is never overwritten on
later starts or upgrades.

## MVP experience

### Radar library

- List the available radars and open one for editing.
- Create a radar with a name and optional purpose.
- Seed every new radar with the initial four-quadrant, four-ring template.
- Rename or delete a radar with confirmation.

### Radar workspace

- Show a live SVG radar and an authoritative blip table together on wide screens.
- Switch between Radar and Blips views on narrow screens.
- Link selection in both directions: selecting a marker reveals its row and selecting a
  row highlights its marker.
- Use compact, deterministic markers so long names do not collide inside the radar; show
  the selected blip's full details outside the SVG.

### Blip editing

- Add, rename, describe, reposition, and delete a blip in the UI.
- Place a blip with explicit quadrant and ring controls in a form or table; movement by
  dragging the visualization is not required.
- Keep descriptions as plain text and turn URLs into safe clickable links when displayed.
- Use explicit save actions for create and detail forms, immediate saves for placement
  controls, visible pending/error states, and confirmation before deletion.

## MVP acceptance boundary

The MVP is complete when a clean installation can seed the bundled radar, create another
radar, persist all radar and blip edits across restarts, and render both accurately on
desktop and mobile. The primary end-to-end test is:

1. Start with an empty database and open the bundled radar.
2. Create a second radar from the fixed template.
3. Add a blip, edit its details, and move it to another ring and quadrant.
4. Observe every change in the live visualization.
5. Restart the application and observe the same state without duplicating or resetting
   the bundled radar.

## Deferred upgrades

- Custom quadrant and ring names, order, and count.
- Dragging markers to change placement and optional manual marker positioning.
- Edition snapshots, movement history, and comparisons between editions.
- Authentication, teams, permissions, public links, and hosted deployment.
- Import and export, including BYOR and CSV compatibility.
- Feeds, candidate blips, classification, and model integrations.
- Relationships between blips, growth views, digests, chat, and read tracking.

## See also

- [architecture.md](./architecture.md) — domain model, system architecture, tech stack,
  and design decisions.
- [../roadmap.md](../roadmap.md) — staged plan for the deferred upgrades above.
