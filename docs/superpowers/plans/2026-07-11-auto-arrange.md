# Auto-Arrange Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Auto-arrange" toolbar button that tidies the graph into a clean left-to-right dependency layout with one click (and one undo).

**Architecture:** A pure `computeLayout(nodes, edges)` function runs the graph through **dagre** (the layout algorithm the spec named for generated nodes) and returns a new `{x,y}` per node. A new store action `setLayouts(positions)` applies them all in a single mutation — so auto-arrange is one `zundo` history entry (fully undoable). The toolbar button calls `setLayouts(computeLayout(...))` then `fitView`. The store stays dagre-free; layout math lives in `canvas/autoLayout.ts` and is unit-tested in isolation.

**Tech Stack:** `@dagrejs/dagre` (maintained dagre fork) · React 19 · @xyflow/react 12 · Zustand/zundo. Tests: Vitest 4.

## Global Constraints

- **Runner is `bun`**; TypeScript strict — no `any`. Per-task commits.
- **The `graphStore` is the single write path**; auto-arrange writes only through `setLayouts`.
- **Layout is separate from semantics** (`atomiser.md` §6) — `setLayouts` touches only the `layouts` map, never nodes/edges.
- **Auto-arrange is one undoable action** — `setLayouts` is a single `set()`, so `zundo` records it as one history entry (it is *not* a drag, so it is not paused).
- **Direction is left-to-right** (`rankdir: 'LR'`) — matches the graph's dependency-flow arrows.
- Branch: `feat/editor-enhancements` (continues the enhancements; extends PR #2). Stays on Vite in `prototype-canvas/`.

---

## File Structure

**New:**
- `src/canvas/autoLayout.ts` — `computeLayout(nodes, edges)` pure function (dagre).
- `src/canvas/autoLayout.test.ts` — its tests.

**Modified:**
- `src/store/graphStore.ts` — add `setLayouts(positions)` action + interface entry.
- `src/store/graphStore.test.ts` — add a `setLayouts` case.
- `src/canvas/Toolbar.tsx` — add the Auto-arrange button + handler.
- `src/canvas/Toolbar.test.tsx` — add an auto-arrange case.

---

## Task 1: dagre layout function

**Files:**
- Create: `src/canvas/autoLayout.ts`
- Test: `src/canvas/autoLayout.test.ts`

**Interfaces:**
- Produces: `computeLayout(nodes: GraphNode[], edges: GraphEdge[]): Record<string, { x: number; y: number }>` — a top-left position per node id, laid out left-to-right by dependency.

- [ ] **Step 1: Install dagre**

```bash
cd /Users/kavinnimalarajan/atomiser/prototype-canvas
bun add @dagrejs/dagre
```

- [ ] **Step 2: Write the failing test — `src/canvas/autoLayout.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { computeLayout } from './autoLayout';
import { newEdge, newNode } from '../schema';

describe('computeLayout', () => {
  it('lays a dependency chain left-to-right (downstream nodes further right)', () => {
    const a = newNode({ title: 'A' });
    const b = newNode({ title: 'B' });
    const c = newNode({ title: 'C' });
    const pos = computeLayout([a, b, c], [newEdge(a.id, b.id), newEdge(b.id, c.id)]);
    expect(pos[a.id].x).toBeLessThan(pos[b.id].x);
    expect(pos[b.id].x).toBeLessThan(pos[c.id].x);
  });

  it('returns a position for every node, including orphans', () => {
    const a = newNode();
    const orphan = newNode();
    const pos = computeLayout([a, orphan], []);
    expect(pos[a.id]).toBeDefined();
    expect(pos[orphan.id]).toBeDefined();
  });

  it('tolerates edges whose endpoints are missing from the node list', () => {
    const a = newNode();
    const pos = computeLayout([a], [newEdge(a.id, 'ghost')]);
    expect(pos[a.id]).toBeDefined();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `bun run test src/canvas/autoLayout.test.ts`
Expected: FAIL — `Cannot find module './autoLayout'`.

- [ ] **Step 4: Create `src/canvas/autoLayout.ts`**

```ts
import dagre from '@dagrejs/dagre';
import type { GraphEdge, GraphNode } from '../schema';

// Fixed node-box estimates — generous enough that varied real heights don't overlap.
const NODE_W = 220;
const NODE_H = 100;

export function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    const p = g.node(n.id);
    // dagre reports node centers; React Flow positions are top-left.
    if (p) positions[n.id] = { x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - NODE_H / 2) };
  }
  return positions;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run test src/canvas/autoLayout.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck** — `@dagrejs/dagre` ships its own types.

Run: `bun run typecheck`
Expected: no errors. If TS cannot find dagre types, create `src/dagre.d.ts` with `declare module '@dagrejs/dagre';` and re-run — but check first, the package bundles types.

- [ ] **Step 7: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: dagre auto-layout compute function" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: setLayouts store action

**Files:**
- Modify: `src/store/graphStore.ts`
- Test: `src/store/graphStore.test.ts`

**Interfaces:**
- Produces: `setLayouts(positions: Record<string, { x: number; y: number }>): void` — batch-updates existing layouts in one mutation (unknown ids ignored).

- [ ] **Step 1: Add the failing test** — append inside the `describe('graphStore nodes & edges', …)` block in `src/store/graphStore.test.ts`:

```ts
  it('setLayouts moves multiple nodes in one operation', () => {
    const a = s().addNode({ x: 0, y: 0 });
    const b = s().addNode({ x: 0, y: 0 });
    s().setLayouts({ [a]: { x: 100, y: 200 }, [b]: { x: 300, y: 400 }, ghost: { x: 9, y: 9 } });
    expect(s().layouts[a]).toMatchObject({ x: 100, y: 200 });
    expect(s().layouts[b]).toMatchObject({ x: 300, y: 400 });
    expect(s().layouts.ghost).toBeUndefined();
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/store/graphStore.test.ts`
Expected: FAIL — `setLayouts is not a function`.

- [ ] **Step 3: Add the interface entry in `src/store/graphStore.ts`** — after `moveNode`:

```ts
  moveNode: (id: string, x: number, y: number) => void;
  setLayouts: (positions: Record<string, { x: number; y: number }>) => void;
```

- [ ] **Step 4: Add the action inside `graphActions`** — right after the `moveNode` action:

```ts
  setLayouts: (positions) =>
    set((s) => {
      const layouts = { ...s.layouts };
      for (const [id, pos] of Object.entries(positions)) {
        const l = layouts[id];
        if (l) layouts[id] = { ...l, x: pos.x, y: pos.y };
      }
      return { layouts };
    }),
```

- [ ] **Step 5: Run the store test to verify it passes**

Run: `bun run test src/store/graphStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: setLayouts store action (batch layout update, one history entry)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Auto-arrange toolbar button

**Files:**
- Modify: `src/canvas/Toolbar.tsx`
- Test: `src/canvas/Toolbar.test.tsx`

**Interfaces:**
- Consumes: `computeLayout` (Task 1), `setLayouts` (Task 2), `useReactFlow().fitView`.
- Produces: an "Auto-arrange" button in the toolbar's tools section that re-lays-out the whole graph and fits the view.

- [ ] **Step 1: Add the failing test** — append inside the `describe('Toolbar', …)` block in `src/canvas/Toolbar.test.tsx`:

```tsx
  it('auto-arrange repositions connected nodes left-to-right', () => {
    const g = useGraphStore.getState();
    const a = g.addNode({ x: 0, y: 0 });
    const b = g.addNode({ x: 0, y: 0 });
    g.connect(a, b);
    render(
      <ReactFlowProvider>
        <div style={{ width: 600, height: 400 }}>
          <ReactFlow nodes={[]} edges={[]} />
          <Toolbar />
        </div>
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Auto-arrange' }));
    const la = useGraphStore.getState().layouts[a];
    const lb = useGraphStore.getState().layouts[b];
    expect(la.x).toBeLessThan(lb.x);
  });
```

> Note: `Toolbar.test.tsx` already imports `ReactFlow`, `ReactFlowProvider`, `render`, `screen`, `fireEvent`, and `useGraphStore` for the existing case — reuse them; add no new imports.

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/canvas/Toolbar.test.tsx`
Expected: FAIL — no button named "Auto-arrange".

- [ ] **Step 3: Wire the button into `src/canvas/Toolbar.tsx`**

Add the import (after the `TYPE_GLYPH` import):

```tsx
import { computeLayout } from './autoLayout';
```

Add the handler inside the component, after the `create` function:

```tsx
  const autoArrange = () => {
    const g = useGraphStore.getState();
    g.setLayouts(computeLayout(Object.values(g.nodes), Object.values(g.edges)));
    rf.fitView({ duration: 400, padding: 0.2 });
  };
```

Insert the button between the Redo button and the Fit-view button (after the `</button>` that closes Redo, before the Fit-view `<button>`):

```tsx
      <button
        aria-label="Auto-arrange"
        title="Auto-arrange"
        onClick={autoArrange}
        className={btn}
        style={{ color: th.text }}
      >
        ▦
      </button>
```

- [ ] **Step 4: Run the toolbar test to verify it passes**

Run: `bun run test src/canvas/Toolbar.test.tsx`
Expected: PASS (existing create case + new auto-arrange case).

- [ ] **Step 5: Full suite + typecheck + build**

Run: `bun run test && bun run typecheck && bun run build`
Expected: all pass; build succeeds.

- [ ] **Step 6: End-to-end browser verification**

Restart the dev server and drive it (`B="$HOME/.claude/skills/gstack/browse/dist/browse"`):

```bash
lsof -ti:5173 | xargs kill 2>/dev/null; sleep 1
cd /Users/kavinnimalarajan/atomiser/prototype-canvas && (nohup bun run dev >/tmp/vite-arrange.log 2>&1 &) ; sleep 3
$B goto "http://localhost:5173/"
$B console --errors
$B screenshot /tmp/arrange-before.png
```

Then:
1. Drag a couple of nodes into a messy pile.
2. Click the **▦ Auto-arrange** button (tools section of the left toolbar).
3. The graph snaps into a tidy left-to-right layout and the view fits to it. Screenshot `/tmp/arrange-after.png`.
4. Press **⌘Z** (or the Undo button) → the layout returns to the pre-arrange positions (auto-arrange is one undo step).
5. No app console errors (the React Flow nodeTypes dev warning is pre-existing/benign).

- [ ] **Step 7: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: auto-arrange toolbar button (dagre LR layout, one-click tidy)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage:** dagre auto-layout (Task 1) ✓; single-mutation apply so it's one undo step (Task 2, Global Constraints) ✓; toolbar button + fit + browser undo check (Task 3) ✓; layout-only writes, semantics untouched (Task 2 touches only `layouts`) ✓; LR direction matching arrow flow (Task 1) ✓.
- **Type consistency:** `computeLayout(nodes, edges) → Record<string,{x,y}>` and `setLayouts(positions: Record<string,{x,y}>)` use the same shape; the Toolbar passes `Object.values(g.nodes)` / `Object.values(g.edges)` (arrays) into `computeLayout` as typed. `newNode`/`newEdge` used in tests already exist in `src/schema.ts`.
- **Placeholder scan:** every code step is complete; the one conditional (dagre types missing → add a `declare module`) names the concrete fix and says to check first.
- **Watch-items:** (1) `@dagrejs/dagre` type resolution — resolved inline if needed; (2) `rf.fitView` in the jsdom Toolbar test — the existing create-node case already exercises the React Flow instance in jsdom without throwing, so `fitView` there is safe; the assertion is on the store layout, not the view.
