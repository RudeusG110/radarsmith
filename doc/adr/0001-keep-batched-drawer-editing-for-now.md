# Keep drawer-based batched blip editing; defer per-field autosave

`doc/frontend_design/flow-4-prototype-final.html` prototypes an inline editing model where
placement and name save instantly on change and description uses an explicit save button with
an inline status indicator. We decided **not** to adopt this yet: the existing modal drawer
with batched, multi-field save (TICKET-014) stays as-is, restyled but not reworked.

Autosave-vs-explicit-save is really a facet of the still-undesigned draft/edition/publish
model — movement, a "publish view", and BYOR export all hang off it (see
`doc/roadmap/mvp-tickets.md`'s Post-MVP upgrades). Deciding save granularity now would mean
building throwaway workflow, not just throwaway styling, once that model is designed
deliberately.
