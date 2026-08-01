# Split the radar workspace into a read-only View mode and an editing Edit mode

The radar workspace gets two rendering modes, toggled in the header, sharing the same route
and state: **View** (full-width radar; clicking a blip or a quadrant shows detail or a
ring-grouped table in one shared side panel; no edit affordances) and **Edit** (today's
split-screen radar + full blip table + add/edit/delete drawers, unchanged workflow, just
restyled). Opening an existing radar defaults to View; finishing radar creation defaults to
Edit, since a brand-new radar has nothing yet to view.

We considered keeping `flow-4-prototype-final.html`'s single fixed-column split
(radar in a 460px side column, table always visible) for every visit, but rejected it: it
forces full editing chrome onto every browse-only visit and crowds the radar's markers into a
column too narrow for dense sectors. Two modes let the radar be the primary artifact when
browsing and keep editing controls out of the way until asked for.
