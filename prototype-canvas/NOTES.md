# Canvas prototype — NOTES (throwaway)

**Question this prototype answers:** what should Atomiser's core workspace look and feel
like — where does the agent live relative to the canvas, and how should typed nodes,
status, and proposal diffs read visually?

**How to run:** `bun install && bun run dev` in this directory, then open
http://localhost:5173. Switch variants with the floating bottom bar or `←`/`→`
(or `?variant=D|A|B|C`).

- **D — Hybrid + settings** _(current direction)_: Variant B's chat-first structure as
  the base; theme (Paper/Studio), font (Editorial/IBM Plex/Archivo), and connector style
  (curved/angular/straight) are user settings behind the ⚙ in the transcript header,
  persisted to localStorage. Defaults = B's own look.
- **A — Studio**: canvas-first dark editor; agent docked as a right-hand panel; proposal
  diffs as cards in the panel + amber ghost nodes/edges on canvas.
- **B — Manuscript**: chat-first split; editorial paper look; the graph is an artifact of
  the conversation; proposals inline in the transcript ("weave in / set aside").
- **C — Mission Control**: tracker-first; status-saturated nodes, progress meter, "Up next"
  dock computed from the real dependency graph; suggestions in a quiet tray.

All state is in-memory. The agent is canned. Everything here is prototype-grade on purpose.

## Verdict

_In progress (2026-07-08): narrowed to A vs B, leaning B — variant D is the merge
candidate (B's structure; theme/font/connectors as workspace settings). Confirm D,
record the final call here, then delete this directory. Fold the decision into
atomiser.md._
