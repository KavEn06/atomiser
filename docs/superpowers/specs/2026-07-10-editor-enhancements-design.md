# Editor Enhancements — Design Spec

**Date:** 2026-07-10
**Status:** Approved (brainstorming) → ready for implementation planning
**Branch:** `feat/editor-enhancements` (off `feat/flowgraph-editor-v0`)

## Context

The v0 user-focused flowgraph editor is built (PR #1): a persistent React Flow canvas with typed
nodes, editable edges, status cycling, and a node detail drawer whose content is an ordered list of
text/image/chart blocks. This spec covers the next round of editing affordances the user asked for,
which fall into two layers:

- **Canvas layer** — undo/redo, edge arrowheads, variable edge width, and a Miro-style left toolbar.
- **Content layer** — Google-Docs-style rich text in text blocks (Tiptap), and a cleaner insert
  affordance for blocks.

All decisions below were settled during a brainstorming session. The guiding constraints from the v0
work still hold: `bun` is the runner, TypeScript strict, the graph store is the single write path, and
the schema stays shaped like `atomiser.md` §6 so the eventual Postgres/Drizzle port stays mechanical.

## Goals

1. Undoable editing with keyboard shortcuts and buttons.
2. Readable edge direction (arrowheads) and expressible flow importance (edge weight).
3. A left canvas toolbar for typed node creation + canvas tools, Miro-style.
4. Rich text formatting inside text blocks (bold/italic/underline, font size, font family, bullet list).
5. A tidy insert affordance for the three block types.

## Non-goals (YAGNI)

- No collaborative/multiplayer undo (single-user history only).
- No arbitrary font uploads — font family is a small curated set (Sans / Serif / Mono).
- No rich text in image captions or chart labels — plain text there.
- No per-keystroke graph-history entries — typing/dragging bursts collapse (debounced).
- Agent mode / AI remains out of scope.

---

## Feature 1 — Undo / redo

**Approach:** wrap the existing `graphStore` with [`zundo`](https://github.com/charkour/zundo), a ~1 KB
temporal middleware for Zustand. It exposes `useGraphStore.temporal` with `undo()`, `redo()`,
`clear()`, and `pastStates` / `futureStates`.

**What's tracked:** `nodes`, `edges`, `layouts`, `graph` (the same slices `partialize` already persists).
Actions and derived data are excluded.

**Debounce:** configure zundo's `handleSet` with a ~500 ms debounce so a run of rapid mutations (typing
into a block, dragging a node) collapses into a single history entry instead of dozens.

**Shortcuts:** a global `keydown` listener:
- `⌘/Ctrl+Z` → undo, `⇧⌘/Ctrl+Z` and `Ctrl+Y` → redo.
- **Focus routing:** if the active element is inside a text editor (a Tiptap/ProseMirror editor, an
  `<input>`, or a `<textarea>`), the handler does nothing — the editor's own history handles it. Only
  when focus is on the canvas/chrome does it drive the graph history. This matches Figma/Miro/Docs.

**Buttons:** Undo / Redo live in the left toolbar (Feature 3), disabled when `pastStates` /
`futureStates` are empty.

**Interaction with block content:** block content edits go through `updateBlock`, so they are part of
the tracked state. Debounced, a typing session is one graph-history step; Tiptap additionally provides
fine-grained undo *while the editor is focused*. This is intentional and consistent with the focus
routing above.

---

## Feature 2 — Edge arrows + variable width

**Arrowheads:** every edge renders a themed `MarkerType.ArrowClosed` at the target end, colored to the
edge stroke. Applied in the `LabelledEdge` component / `selectFlowEdges` mapping. Direction becomes
legible (e.g. `sensors → pump`, `budget ⟿ MCU`).

**Weight (flow importance):**
- `GraphEdge` gains `weight: 'thin' | 'normal' | 'bold' | 'heavy'`, default `'normal'`.
- Mapping to stroke width: `thin` 1 px · `normal` 1.6 px · `bold` 2.6 px · `heavy` 4 px.
- **Setter:** `setEdgeWeight(id, weight)` on the store.
- **UI:** when an edge is selected, a small floating control appears near its label (in the existing
  `EdgeLabelRenderer` layer) with the four weight presets. Presets, not a numeric field — quick and
  legible.
- Persisted with the rest of the graph. Legacy edges without `weight` render as `'normal'`.

The global connector-shape setting (curved / angular / straight) is unchanged and composes with weight.

---

## Feature 3 — Left toolbar (Miro-style)

A fixed vertical bar pinned to the **left** edge of the canvas area (the right side is reserved for the
node drawer, so left avoids the collision). Themed via the settings store for both paper and studio.

**Sections (top to bottom):**
- **Create** — one button per node type: `▢ Task`, `◈ Decision`, `⚑ Milestone`, `§ Constraint`. Clicking
  drops a node of that type at the current **viewport centre** (via `useReactFlow().screenToFlowPosition`
  of the canvas centre), leaves it selected, and is immediately undoable.
- **Tools** — `↶ Undo`, `↷ Redo` (wired to `temporal`, disabled when empty), `⤢ Fit view`
  (`fitView()`).

**Header change:** the header's generic "＋ Add node" button is removed (creation now lives in the bar).
The header keeps: title, IDE/Agent mode indicator, Clear, ⚙ settings.

**Component boundary:** `src/canvas/Toolbar.tsx`, rendered inside the canvas container (so it overlays
the React Flow surface, like the built-in Controls). It reads the create/fit actions and `temporal`
state.

---

## Feature 4 — Rich text in text blocks (Tiptap)

**Editor:** replace the plain `<textarea>` in `TextBlock` with a Tiptap (`@tiptap/react`) editor.
Extensions: `StarterKit` (paragraphs, bold, italic, bullet list, history), `Underline`, `TextStyle`,
`FontFamily`, and a font-size mark (`@tiptap/extension-font-size` or a small custom `TextStyle`-based
mark).

**Formatting toolbar** (shown above the focused text block):
- **B / I / U** toggles.
- **Font size** dropdown — a curated set (e.g. Small / Normal / Large / XL).
- **Font family** dropdown — curated: Sans / Serif / Mono (mapped to the project's font stacks).
- **Bullet list** toggle.

**Data model change:** `TextBlock` becomes `{ id, type: 'text', html: string }` (was
`{ …, markdown: string }`). **Back-compat:** the editor initializes from `block.html ?? block.markdown ?? ''`,
and `newTextBlock()` produces `{ html: '' }`. Any legacy markdown text blocks in localStorage render as
their raw text on first open, then persist as html once edited. `GraphOp` `add_node`/`update_node`
payloads follow the new block shape.

**Undo:** Tiptap's own ProseMirror history handles in-editor undo while focused; the focus routing in
Feature 1 ensures `⌘Z` there doesn't yank the graph.

**Rendering:** the editor is the display (WYSIWYG) — no separate render path needed. Content is stored
as sanitized HTML produced by Tiptap.

---

## Feature 5 — Insert affordance

The drawer's three "Add text / Add image / Add chart" buttons become a single **Insert** row — a compact
labelled group (icon + label per type) that calls the existing `addBlock(nodeId, kind)`. No new store
behavior; purely presentation, so blocks read as "insert a …" rather than raw buttons.

---

## Data model & dependencies

**Schema (`src/schema.ts`):**
- `GraphEdge`: `+ weight: 'thin' | 'normal' | 'bold' | 'heavy'` (default `'normal'` via `newEdge`).
- `TextBlock`: `{ id; type: 'text'; html: string }` (was `markdown`). `newTextBlock()` returns
  `{ html: '' }`.
- `GraphOp` / `Proposal` stay in 1:1 correspondence with mutations (add `set_edge_weight` is *not*
  needed as an op yet — weight is a user-only edit like status).

**Store (`src/store/graphStore.ts`):**
- `+ setEdgeWeight(id, weight)`.
- Wrap creator in `temporal(persist(...))` (zundo outside persist). Re-verify `partialize` still works
  and that `temporal` tracks the intended slices via its own `partialize`.
- `selectFlowEdges` adds `markerEnd` + stroke width from `weight`.

**New dependencies:**
- `zundo`
- `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-underline`,
  `@tiptap/extension-text-style`, `@tiptap/extension-font-family`, and a font-size solution.

**Bundle note:** Tiptap/ProseMirror is the largest new dependency (the build is already ~790 KB gzip
240 KB). Acceptable for this local prototype; flagged and accepted.

---

## Components (new / changed)

| File | Responsibility |
|---|---|
| `src/canvas/Toolbar.tsx` (new) | Left vertical bar: typed-node create, undo/redo, fit. |
| `src/canvas/LabelledEdge.tsx` (change) | Arrowhead marker; selected-edge weight control. |
| `src/canvas/Editor.tsx` (change) | Mount `Toolbar`; pass create-at-centre + fit. |
| `src/detail/blocks/TextBlock.tsx` (rewrite) | Tiptap editor + formatting toolbar. |
| `src/detail/blocks/RichTextToolbar.tsx` (new) | B/I/U, font size, font family, list controls. |
| `src/detail/BlockList.tsx` (change) | Insert row instead of raw add buttons. |
| `src/store/graphStore.ts` (change) | zundo wrap; `setEdgeWeight`; edge styling in selector. |
| `src/canvas/useHistoryShortcuts.ts` (new) | Global undo/redo keydown hook with focus routing; mounted by `App`. |
| `src/schema.ts` (change) | `weight` on edge; `html` on text block; factories. |
| `src/theme.ts` (maybe) | Font-family stack mapping for the rich-text font dropdown. |
| `src/App.tsx` (change) | Remove header "Add node"; mount history shortcuts. |

## Testing

TDD, matching the v0 approach:

- **Store:** `setEdgeWeight`; typed-node creation helper used by the toolbar; `newTextBlock` html shape +
  legacy-markdown read; zundo `temporal.undo()/redo()` reverts/reapplies a node add and a status change.
- **Selector:** `selectFlowEdges` emits `markerEnd` and the correct stroke width per weight.
- **Components:** `Toolbar` creates a node of the clicked type (store assertion); edge weight control sets
  weight; `RichTextToolbar` bold toggle reflects in the Tiptap editor state (or a store assertion on
  persisted html); Tiptap renders without throwing in jsdom (smoke).
- **Shortcuts:** focus routing — a keydown while a text input is focused does *not* trigger graph undo.
- **E2E (browser):** create nodes from the toolbar; undo/redo via buttons and shortcuts; select an edge and
  thicken it; arrowheads visible; open a node, bold some text, change font, reload → formatting persists.

## Implementation phasing

Two independently shippable plans:

- **Plan A — Canvas:** undo/redo (zundo + shortcuts + buttons), edge arrows, edge weight + control, left
  toolbar. Self-contained; no Tiptap.
- **Plan B — Content:** Tiptap rich text + formatting toolbar, text-block `html` migration, insert row.

Each ends green (tests + typecheck + build + browser check) on its own.

## Risks / watch-items

- **Tiptap + React 19 / Vite:** verify the installed Tiptap majors support React 19; sanity-check SSR-off
  usage (we're client-only). Mitigation: pin known-good versions, smoke-test render early.
- **zundo + persist ordering:** middleware order matters (`temporal(persist(...))`); verify persisted
  rehydration doesn't seed the undo stack with a spurious entry (call `temporal.clear()` after
  hydration/seed if needed).
- **Focus routing correctness:** the ProseMirror editor is a `contenteditable`, not an `<input>` —
  detect it via `closest('.ProseMirror')` (or `isContentEditable`) so `⌘Z` routes correctly.
- **Legacy text blocks:** existing localStorage may hold `markdown` text blocks from v0 testing — the
  `html ?? markdown` read prevents data loss.
