# Plan — Expandable nodes: type-aware detail in the node drawer

## Context

A node today is thin: a title, a type select, a status select, and a freeform list of text/image/chart
blocks. Nothing in the drawer knows what *kind* of node it is looking at. On the canvas a card shows
only glyph, title and status — `body` is never read outside the drawer, so a node full of notes looks
identical to an empty one.

This builds **atomiser.md §2's "Expandable nodes"** — *"each node opens into deeper guidance for that
step"* — in its type-aware form: each of the four node types gets a small set of structured fields,
rendered above the existing block list. No AI, no new dependencies, no backend.

Two things were weighed and chosen deliberately:

- **§5 calls deep node content the "#1 scope-creep risk"** (*"Each is a product of its own"*). That was
  put to the user, who chose this direction anyway. The mitigation is a deliberately tight field set:
  this ships **structure** (a done-condition, options, criteria) and leaves **content** (code, diagrams,
  procedures) to the block list that already exists.
- **§14 leaves the node taxonomy open.** Per-type fields harden it, so the design must stay cheap to
  change — see the taxonomy note at the end.

**Branch:** `feat/expandable-nodes`, cut from `feat/whats-next` (6 commits ahead of main, 99 tests
green). PR base is `feat/whats-next` while that PR is open; if it merges first, `git rebase main`.
Always stage with `git add -A -- prototype-canvas` (or `-- docs`) — main's tree has unrelated dirty
files under `.gstack/`.

## Decisions baked in

| Decision | Choice | Why |
|---|---|---|
| Where details live | `meta.details[nodeType]` — one bucket per type | `meta` is already persisted, already in `updateNode`'s patch type, already tracked by zundo, and is §6's JSONB column. Bucketing makes type-switching non-destructive *structurally*, not by convention, and leaves the rest of `meta` free for the domain fields §6 reserves it for. |
| `description` | Real top-level `GraphNode.description?: string` | §6 lists it as a column *alongside* `meta`; `meta` is for domain-specific fields and `description` is universal. Optional because persisted nodes lack it — every read is `?? ''`, no migration. |
| Type switching | Old buckets kept, invisible, reversible | Destroying a decision's options on a mis-click is unrecoverable when localStorage is the only store. `readDetails` only reads the current type's bucket, so stale ones cost one unread key. |
| Field editors | Plain `<input>` / `<textarea>` / buttons — **not Tiptap** | Tiptap never syncs external content changes (an undo would leave stale text on screen) and `TextBlock` *pauses* the temporal store on focus, which would drop these edits out of undo entirely. These are short structured values; the block list stays the rich surface. |
| Write path | Always `updateNode` | Lands in undo + localStorage free; no new store action. |
| Drawer layout | Inside the existing scroll area, above `<BlockList/>`, separated by a rule. Not collapsible. Width stays 380px. | One scroll region, chrome unchanged. Collapsible needs per-node state and makes a new feature *less* discoverable; the field set was trimmed instead. **Resizable drawer is out of scope.** |
| Component shape | `NodeDetails.tsx` switcher + one component per type in `src/detail/details/` | Mirrors `BlockList.tsx` + `blocks/`. Uses a `switch` with a `never` guard — unlike `BlockList`'s unguarded if-chain. |
| Canvas marker | In scope — a dot when a node has content | ~10 lines, no selector change, and without it nothing hints a node holds anything. |
| Known adjacent defects | All out | Blob GC, Tiptap sync, write-only font selects, chart `NaN`, `BlockView`'s missing guard. This plan touches none of that code. |

### Field sets

| Type | Fields | What was dropped, and why |
|---|---|---|
| **task** | `doneWhen: string`, `effort: 'S'\|'M'\|'L'\|null` | Implementation notes — the block list directly below *is* the notes surface. `doneWhen` is §7's stopping rule made editable (*"a single work session with an unambiguous done-condition"*), the strongest justification for the whole feature. |
| **decision** | `options: {id,label,note}[]`, `chosenId`, `rationale` | "The question" — the node's title already is it (`Choose MCU — ESP32 vs RP2040`). |
| **milestone** | `criteria: {id,text,met}[]`, `targetDate` | Nothing. `met` gives a free `2/4` readout. |
| **constraint** | `hardness: 'hard' \| 'soft'` | "The rule" — that's the title (`Budget ≤ $120`) plus `description`. Two places to edit one sentence. |

Eight `meta` fields plus one column.

---

## Task 1 — Branch + plan doc

```bash
cd /Users/kavinnimalarajan/atomiser && git checkout feat/whats-next && git status --short -- prototype-canvas && git checkout -b feat/expandable-nodes
```
Save this as `docs/superpowers/plans/2026-09-08-expandable-nodes.md`; commit
`docs: type-aware expandable nodes implementation plan`.

## Task 2 — `description` on `GraphNode`

**Files:** `src/schema.ts`, `src/store/graphStore.ts`, `src/schema.test.ts`, `src/store/graphStore.test.ts`.

1. Failing tests: `newNode().description` is `undefined` and `newNode({description})` round-trips;
   `updateNode(id, { description })` writes it.
2. `src/schema.ts` — add after `title`, with a comment noting §6 lists it as a column not meta, and
   that it is optional so pre-existing persisted nodes still load:
   ```ts
   description?: string;
   ```
   `newNode` is unchanged — the field only appears in storage once someone writes one.
3. `src/store/graphStore.ts` — widen the patch to
   `Partial<Pick<GraphNode, 'title' | 'description' | 'nodeType' | 'status' | 'meta' | 'body'>>`.
4. `bun run test && bun run typecheck` → 101 green. Commit
   `feat: description on GraphNode (optional, no migration)`.

## Task 3 — Detail types + parse/merge helpers  ← the load-bearing piece

**Files:** create `src/detail/details/parse.ts` + `parse.test.ts`; modify `src/schema.ts`.

**Interfaces:** `readDetails(node) → NodeDetails`, `mergeDetails(meta, nodeType, patch) → meta`,
`hasContent(node) → boolean`, `newOption()`, `newCriterion()`.

1. **Failing tests first** (pure vitest, no RTL, no store) covering: defaults for all four types;
   never throwing on garbage (`details: 'nope'`, `{task: 5}`, `{doneWhen: 42, effort: 'XL'}`, `null`);
   round trip; exact storage shape `{ details: { task: { doneWhen: 'x' } } }`; type-switch keeps both
   buckets; **purity** (`mergeDetails` must not mutate the input `meta`); unrelated `meta` keys survive;
   a `chosenId` pointing at a deleted option reads back as `null`; list coercion drops id-less entries
   and defaults wrong-typed values; dates accept `2026-09-30` and reject `tomorrow` / `12` / `2026-9-3`;
   `hasContent` false for an empty node and a whitespace-only description, true for a block, a
   `doneWhen`, an `effort`, or `hardness: 'soft'` (but *not* `'hard'` — that's the birth default).
2. `src/schema.ts` — append after the `Block` union: `EFFORTS`/`Effort`, `HARDNESS`/`Hardness`,
   `DecisionOption`, `Criterion`, the four `*Details` types, then
   ```ts
   export type DetailsByType = { task: TaskDetails; decision: DecisionDetails;
     milestone: MilestoneDetails; constraint: ConstraintDetails };
   // Indexing by NodeType makes it exhaustive: add a node type and this stops
   // compiling until the map grows an entry (§14).
   export type NodeDetails = DetailsByType[NodeType];
   ```
3. `src/detail/details/parse.ts` — the whole point is that **`meta` is untyped JSONB that may hold
   anything**, so every read *coerces* rather than validates and can never throw. Small local helpers
   `rec` / `str` / `arr` / `oneOf` / `withIds` / `readDate`, then:
   - `readDetails` switches on `node.nodeType`, reading `meta.details[nodeType]` and defaulting every
     field. The decision case self-heals a stale `chosenId` (`options.some(...) ? chosenId : null`).
     `withIds` **drops** entries with no usable id rather than minting one — `readDetails` runs on
     every render, so minting would churn state forever.
   - `mergeDetails(meta, nodeType, patch)` returns `{...meta, details: {...details, [nodeType]: {...old, ...patch}}}`
     — writes only its own bucket, mutates nothing.
   - `hasContent(node)` — true if any block, a non-blank description, or any type-specific field is set.
   - `newOption()` / `newCriterion()` using `nanoid` (already a dependency).

   Both switches are exhaustive by construction: the annotated non-nullable return types make
   `strictNullChecks` error on any unhandled `NodeType`.
4. Green + typecheck. Commit `feat: typed node details over meta — read, merge, defaults`.

## Task 4 — The `Summary` field

**Files:** create `src/detail/details/Field.tsx`, `src/detail/NodeDetails.tsx` + test; modify `NodeDrawer.tsx`.

1. Failing tests (standard harness — `localStorage.clear()`, `useGraphStore.setState(createInitialState())`,
   `useGraphStore.temporal.getState().clear()`): typing in `Summary` writes `description`; it renders
   for a `milestone` too; a node with no stored `description` renders value `''`; **`temporal.undo()`
   restores the previous value**, proving the field is in the undo stack.
2. `Field.tsx` — a caps-label wrapper reusing the existing idiom
   (`${font.caption} text-[9px] tracking-[0.24em] uppercase`, `th.faint`), plus exported
   `controlStyle(th)` and `optionStyle(th, active)` matching `SettingsPanel`'s pickers.
3. `NodeDetails.tsx` — reads the node from the store, renders a `Summary` textarea writing through
   `updateNode(nodeId, { description })`.
4. `NodeDrawer.tsx` — inside the existing scroll area, `<NodeDetails/>` then a
   `mt-4 border-t pt-4` wrapper around `<BlockList/>`.
5. Green. Commit `feat: node summary field in the drawer`.

## Tasks 5–7 — The four field components

Each is a small presentational component taking `{ node, details }`, rendered directly by its own test
(`readDetails(node)` supplies the prop) so every commit stays green before the switcher exists. All
writes go through a local `save(patch)` → `updateNode(node.id, { meta: mergeDetails(node.meta, type, patch) })`.

- **Task 5 — `TaskFields` + `ConstraintFields`.** `Done when` textarea; an `Effort` button row where
  **re-clicking the current value clears it** (effort is optional and there's no other route back to
  unestimated). Constraint is one `Strength` row: `Must hold` / `Prefer`. Tests assert the exact
  `meta` shape and that an unrelated `meta` key survives the write.
  Commit `feat: task done-condition + effort, constraint strength`.
- **Task 6 — `DecisionFields`.** Per option: a radio (`Choose option N`), a label input, a `✕`, and a
  note input beneath. Then `+ Option`, and a readout — `Chosen — <label>` or `Undecided`. Removing the
  chosen option leaves the stale `chosenId` in `meta` **on purpose**, so `readDetails` drops it and a
  single undo restores option and choice together.
  Commit `feat: decision options, choice and rationale`.
- **Task 7 — `MilestoneFields`.** A criteria checklist (checkbox + text + remove, then `+ Criterion`)
  whose `Field` label reads `Acceptance criteria — 1/2`, plus a native `<input type="date">` so
  `targetDate` is always `YYYY-MM-DD` or empty.
  Commit `feat: milestone acceptance criteria + target date`.

## Task 8 — Wire the type switch

**Files:** modify `src/detail/NodeDetails.tsx` + test.

1. Failing tests: each type renders its own fields and not the others; plus **the type-switch case**,
   rendered through the whole `NodeDrawer` so the type `<select>` is present — add an option labelled
   `ESP32` to a decision, switch to `task` (options gone, `Done when` present), switch back, assert
   `Option 1` still has value `ESP32`.
2. A local `Fields` switcher with a `default: { const unhandled: never = details; return unhandled; }`
   guard, so a change to the §14-open taxonomy is a compile error rather than a silently missing section.
3. Green. Commit `feat: type-aware detail section in the node drawer`.

## Task 9 — Canvas marker + seeded examples

**Files:** `src/nodes/FlowNode.tsx` + test, `src/seed.ts`, `src/store/graphStore.persist.test.ts`.

1. Failing tests: a fresh node has no `Has details` element; after `updateNode(id, {description:'x'})`
   it does; a node with a block does too. In the seed test, the `Choose MCU` node reads back 2 options
   and a non-null `chosenId`.
2. `FlowNode.tsx` — wrap the expand button in a right-aligned `<span className="ml-auto flex items-center gap-1">`
   (the button loses its own `ml-auto`, so layout is identical with or without the dot) and render a
   1.5px dot with `title="Has details"` when `hasContent(node)`. Milestone cards are drawn on `th.text`,
   so the dot inverts to `th.app` there.
3. `src/seed.ts` — give the MCU decision real options/rationale and the firmware task a `doneWhen` +
   effort, so the feature is visible on a first load rather than an empty form.
4. Green. Commit `feat: canvas marks nodes that have something inside`.

## Task 10 — NOTES.md, browser check, PR

1. `NOTES.md` — extend the `src/detail/` line to mention the type-aware section
   (`src/detail/details/`, stored in `meta.details[nodeType]`).
2. `bun run test && bun run typecheck && bun run build` → ~123 tests.
3. `bun run dev`, then in Chrome: `localStorage.clear(); location.reload()` to get the seeded examples.
   Verify two `Has details` dots; open `Choose MCU` and see Summary + Options with ESP32 chosen +
   Rationale; the drawer is 380px with no horizontal overflow; switching type to `task` and back keeps
   `ESP32`; `⌘Z` (focus outside the textarea) undoes a field edit; a milestone's criteria heading reads
   `1/1`. Console clean apart from the known React Flow `nodeTypes` StrictMode warning.
   **Do not click the header `Clear` button — it opens a `confirm()` dialog that blocks the extension.**
4. Commit docs, push, `gh pr create --base feat/whats-next`.

## Verification summary

- **Automated:** 99 → ~123 tests. The parse suite is the important one: it proves a node with `meta: {}`
  and no `description` renders every section at its default, and that `null`, strings, numbers and
  wrong-typed values in every position degrade to defaults without throwing.
- **Browser:** seeded detail visible on load, type switch round-trips with no data loss, undo reaches
  the fields, no overflow at 380px.

## Taxonomy stays cheap to change (§14)

Adding a node type produces exactly four compile errors that spell out the work (`DetailsByType`, both
switches in `parse.ts`, the `never` guard) and needs no data migration — old nodes just read defaults.
Removing one: delete the case and component; orphaned buckets sit inert and are never read.

## Follow-ups (deliberately out of scope)

- **Undo granularity** — every keystroke in title/summary/details is one temporal entry against a
  100-entry cap. One zundo `handleSet` debounce in `graphStore.ts` fixes all of them together.
- Collapsible detail section; resizable drawer. Neither blocking at this field set.
- Surfacing details elsewhere: `doneWhen` in the Up next panel, `hardness` on `constrains` edge
  rendering, `description` in the future `.atomiser/plan.yaml` export (§8).
- **Untouched defects:** `BlockView`'s missing exhaustiveness guard, no blob GC (`deleteBlob` has no
  call sites), Tiptap external sync, write-only font selects, chart `NaN`.

## Riskiest call

Dropping the decision `question` field commits to "the title is the question". The seed graph supports
it and `description` is the escape valve, but it's the first thing to revisit if decision nodes read
badly in practice.
