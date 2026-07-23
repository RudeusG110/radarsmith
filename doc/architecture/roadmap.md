# Radar App — Roadmap

Ordered roughly by dependency. Each stage layers onto the authoring core described in
[architecture.md](./architecture.md).

## Stage 1 — Core loop

The first end-to-end release:

1. Store `radar / quadrant / ring / blip` in the database.
2. Render one radar in the web view.
3. Edit it in the UI — add / move / rename / delete blips and quadrants, persisted, with
   movement recorded.
4. Import a BYOR / CSV file.
5. Export BYOR JSON.

## Stage 2 — Make the radar yours

- Custom quadrants and rings in the UI (names, order, count).
- Templates — the ThoughtWorks-style layout plus additional starting points.
- Movement-history UI — a per-blip timeline and a "what changed" view.
- Public-doc URL import — pull a radar definition from a shared link.

## Stage 3 — Feeds and suggestions

- Feed ingestion — RSS/Atom sources produce candidate blips.
- Classification / suggestion adapter — propose a quadrant/ring for each candidate.
- Bring Your Own Model — plug in OpenAI / Azure / Claude / Gemini / Ollama behind the
  suggestion interface.
- Review queue — accept or reject suggested blips into the radar.

## Stage 4 — Teams and departments

- Multi-user and authentication — `owner_scope` / `visibility` become active.
- Shared radars — team stance, alignment, and gaps.
- Department view — aggregate and compare radars across teams.

## Stage 5 — Growth views

Built on top of blip movement history:

- Growth / skill-map renderer — an ordered view derived from blips a user is assessing or
  trialing and how they have moved over time.
- Adjacency and hierarchy — edges between blips ("builds on", "adjacent to") for a map view.
- Personal growth track — a per-user focus lane distinct from the shared radar.

## Stage 6 — Reach and delivery

- Morning digest — a short daily read (email, later chat platforms).
- Chat and search — "what should I read today?", "what's emerging?", "what am I missing?".
- Read-tracking — learn what gets opened to tailor future suggestions.

## Parking lot

- Scoring/ranking of blips (relevance / growth / trend / surprise).
- Multiple profiles or tracks per user.
- Interactive onboarding and a "mark as known" feedback loop.
