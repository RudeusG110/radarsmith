# Radar App — Product Spec

## One sentence

A web app to author, edit, and share your own radar — where blips live in a database, you
move them between rings in the UI, and files or URLs are just import and export.

## The problem

There is no good open tool to **author and maintain your own radar**. ThoughtWorks'
[Build Your Own Radar (BYOR)](https://github.com/thoughtworks/build-your-own-radar) is
render-only: you upload a file or share a URL, you cannot edit a blip in the web, and it
forgets where a blip used to sit. In practice people hand-maintain CSVs or spreadsheets.

This app makes a radar **editable, persistent, and shareable**: open it, add a blip, move
it from Assess to Trial, rename a quadrant, and it is saved — no export/re-upload cycle.

## What a radar is here

A radar is a **positioning tool**. It answers, for a person or a group: _of the things out
there, which are we adopting, trialing, assessing, or holding?_ Its value is the
**opinion and placement**, not the discovery of items. The app is centered on capturing
and maintaining that stance over time.

## Users and scope

The app serves individuals, teams, and departments with the **same core experience**;
they differ only in the content of the radar and how widely it is shared. "Scope" is a
property of a radar (`owner_scope`, `visibility`), not a separate product.

## Core capabilities

- **Author** a radar with your own quadrants and rings (a ThoughtWorks-style layout ships
  as the default template).
- **Edit in the UI** — add, move, rename, and delete blips and quadrants, persisted.
- **Track movement** — a blip remembers where it has been, so you can see what changed.
- **Import** an existing radar from a BYOR/CSV file or a public-doc URL.
- **Export** to BYOR JSON (and CSV) for rendering and sharing.

## Optional inputs

- **Feeds** — RSS/Atom sources that propose candidate blips to add.
- **Classification** — plug in a model to suggest which quadrant/ring a candidate belongs
  in.

## First release (thin, end-to-end)

1. Store `radar / quadrant / ring / blip` in the database.
2. Render one radar in the web view.
3. Edit it in the UI (add / move / rename / delete), persisted with movement recorded.
4. Import a BYOR/CSV file.
5. Export BYOR JSON.

When this loop works, every later capability (feeds, classification, teams, growth views)
is an addition rather than a rewrite.

## See also

- [architecture.md](./architecture.md) — domain model, system architecture, tech stack,
  and design decisions.
- [roadmap.md](./roadmap.md) — planned capabilities.
