# Canvas prototype — verdict & history

**Question the prototype answered:** what should Atomiser's core workspace look and feel
like — where does the agent live relative to the canvas, and how should typed nodes, status,
and proposal diffs read visually?

## Verdict

Variant **D (Hybrid + settings)** won — a canvas workspace with theme / font / connector style
exposed as workspace settings (Paper/Studio · Editorial/IBM Plex/Archivo · curved/angular/
straight), persisted locally. It has been **promoted into the real v0 editor**; the four
throwaway variants (A Studio, B Manuscript, C Mission Control, D Hybrid) and the variant
switcher have been deleted.

For the user-focused v0, the shell is **canvas-first** (the "IDE mode"): D's look and settings
carried over, but the chat pane is deferred until Agent mode exists. Stolen bits worth keeping
from the losers: C's "up next from the dependency graph" dock (a later feature), A's vivid
status palette (available as the Studio theme).

## What this directory is now

No longer throwaway — it is the v0 **user-focused flowgraph editor**:

- `src/schema.ts` — the data model (mirrors atomiser.md §6), with dormant `GraphOp`/`Proposal`
  types ready for Agent mode.
- `src/store/` — Zustand stores: `graphStore` (persisted to localStorage), `blobStore`
  (IndexedDB image blobs), `settingsStore`, `uiStore`.
- `src/canvas/` — React Flow editor + editable labelled edges.
- `src/nodes/` — the custom typed node.
- `src/detail/` — the node drawer + text / image / chart block editors.

**Run:** `bun install && bun run dev`, then open http://localhost:5173. **Test:** `bun run test`.

**Next:** wire persistence to Postgres/Drizzle and add Agent mode (proposal diffs) — see
atomiser.md §9 and the build-order artifact.
