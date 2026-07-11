# Editor Canvas Enhancements (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add undo/redo, directed edge arrowheads, per-edge weight (flow importance), and a Miro-style left creation/tools toolbar to the v0 flowgraph editor.

**Architecture:** Undo/redo comes from wrapping the existing Zustand `graphStore` with `zundo`'s `temporal` middleware — **no debounce**; instead the canvas **pauses** history during node drags, so every discrete edit is exactly one synchronous history entry and node dragging simply isn't recorded. Edge arrowheads and weight-driven stroke width are applied in the `selectFlowEdges` selector (which already maps store edges → React Flow edges) and consumed by the existing `LabelledEdge`, which also grows a small weight-preset control when an edge is selected. The left toolbar is a new component overlaid on the canvas, using `useReactFlow` for viewport-centre node creation and fit-view.

**Tech Stack:** Vite 6 · React 19 · TypeScript strict · @xyflow/react 12 · Zustand 5 · zundo · Tailwind v4. Tests: Vitest 4 · @testing-library/react · jsdom.

## Global Constraints

- **Runner is `bun`** — `bun install`, `bun run dev`, `bun run test`, `bun run typecheck`, `bun run build`. No npm/yarn.
- **TypeScript strict stays on** — no `any` in committed code.
- **The `graphStore` is the single write path** — all mutations go through its actions; `zundo` wraps it transparently.
- **Schema stays shaped like `atomiser.md` §6** — stable ids, layout separate from semantics, structured enums, `origin` on nodes/edges.
- **Edge weight is a user-only edit** (like status) — no `GraphOp` variant is added for it; `GraphOp`/`Proposal` stay in sync with the mutation set otherwise.
- **Documented v1 cut:** node *drag position* is not undoable (history is paused during drag). Structural edits (add/delete/connect/status/label/weight) are fully undoable.
- **Stays in `prototype-canvas/` on Vite.** Branch: `feat/editor-enhancements`.

---

## File Structure

**New:**
- `src/canvas/Toolbar.tsx` — left vertical bar: typed-node create, undo, redo, fit.
- `src/canvas/useHistoryShortcuts.ts` — `historyKeyAction()` pure helper + `useHistoryShortcuts()` hook (global ⌘/Ctrl+Z routing).

**Modified:**
- `src/schema.ts` — `EdgeWeight` type, `weight` on `GraphEdge`, `WEIGHT_STROKE` map, `newEdge` default.
- `src/store/graphStore.ts` — `setEdgeWeight`; wrap creator in `temporal`; arrowheads + weight stroke in `selectFlowEdges`.
- `src/canvas/LabelledEdge.tsx` — render `props.style`/`props.markerEnd`; weight-preset control when selected.
- `src/canvas/Editor.tsx` — pass theme edge colour to selector; pause/resume history on node drag; mount `Toolbar`.
- `src/App.tsx` — remove header "＋ Add node"; mount `useHistoryShortcuts`; clear temporal history after seed/first mount.

**Test files:** `src/store/graphStore.history.test.ts`, plus additions to `src/store/graphStore.persist.test.ts` (selector), `src/canvas/LabelledEdge.test.tsx` (weight control), and new `src/canvas/Toolbar.test.tsx`, `src/canvas/useHistoryShortcuts.test.ts`.

---

## Task 1: Edge weight — schema, store setter, selector arrows + stroke

**Files:**
- Modify: `src/schema.ts`, `src/store/graphStore.ts`
- Test: `src/store/graphStore.persist.test.ts` (add cases), `src/store/graphStore.test.ts` (add case)

**Interfaces:**
- Produces: `EdgeWeight = 'thin' | 'normal' | 'bold' | 'heavy'`; `GraphEdge.weight: EdgeWeight`; `WEIGHT_STROKE: Record<EdgeWeight, number>`; store action `setEdgeWeight(id: string, weight: EdgeWeight): void`; `selectFlowEdges(state, connector, edgeColor?)` now emits `style.strokeWidth` (from weight) and `markerEnd` (ArrowClosed).

- [ ] **Step 1: Add the failing store test** — append to `src/store/graphStore.test.ts` inside the existing `describe('graphStore nodes & edges', …)`:

```ts
  it('newEdge defaults to normal weight; setEdgeWeight changes it', () => {
    const a = s().addNode();
    const b = s().addNode();
    const e = s().connect(a, b)!;
    expect(s().edges[e].weight).toBe('normal');
    s().setEdgeWeight(e, 'heavy');
    expect(s().edges[e].weight).toBe('heavy');
  });
```

- [ ] **Step 2: Add the failing selector test** — append to `src/store/graphStore.persist.test.ts` inside its `describe`:

```ts
  it('selectFlowEdges emits an arrowhead and a weight-based stroke width', () => {
    const a = s().addNode();
    const b = s().addNode();
    const e = s().connect(a, b)!;
    s().setEdgeWeight(e, 'bold');
    const rf = selectFlowEdges(s(), 'curved', '#123456');
    expect(rf[0].markerEnd).toMatchObject({ type: 'arrowclosed', color: '#123456' });
    expect(rf[0].style).toMatchObject({ stroke: '#123456', strokeWidth: 2.6 });
  });
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `bun run test src/store/graphStore.test.ts src/store/graphStore.persist.test.ts`
Expected: FAIL — `setEdgeWeight is not a function`; `markerEnd` undefined.

- [ ] **Step 4: Extend `src/schema.ts`** — add the weight type + map, and a `weight` field.

Add after the `Origin` type:

```ts
export type EdgeWeight = 'thin' | 'normal' | 'bold' | 'heavy';

export const WEIGHT_STROKE: Record<EdgeWeight, number> = {
  thin: 1,
  normal: 1.6,
  bold: 2.6,
  heavy: 4,
};
```

In `interface GraphEdge`, add after `edgeType`:

```ts
  weight: EdgeWeight;
```

In `newEdge`, add `weight: 'normal'` to the returned object's defaults (before `...p`):

```ts
export function newEdge(
  source: string,
  target: string,
  p: Partial<Omit<GraphEdge, 'id' | 'source' | 'target' | 'createdAt'>> = {},
): GraphEdge {
  return {
    id: `e_${nanoid(8)}`,
    graphId: GRAPH_ID,
    source,
    target,
    edgeType: 'dependency',
    weight: 'normal',
    origin: 'user',
    ...p,
    createdAt: now(),
  };
}
```

- [ ] **Step 5: Add `setEdgeWeight` to `src/store/graphStore.ts`**

Update the schema import to add `WEIGHT_STROKE`, `type EdgeWeight`, and add a value import of `MarkerType`:

```ts
import { MarkerType } from '@xyflow/react';
```
and in the `../schema` import list add: `WEIGHT_STROKE,` and `type EdgeWeight,`.

Add to the `GraphState` interface, next to `setEdgeLabel`:

```ts
  setEdgeWeight: (id: string, weight: EdgeWeight) => void;
```

Add the action inside `graphActions`, right after `setEdgeLabel`:

```ts
  setEdgeWeight: (id, weight) =>
    set((s) => {
      const e = s.edges[id];
      if (!e) return {};
      return { edges: { ...s.edges, [id]: { ...e, weight } } };
    }),
```

- [ ] **Step 6: Add arrowheads + weight stroke in `selectFlowEdges`** — replace the whole `selectFlowEdges` function:

```ts
export function selectFlowEdges(
  state: Pick<GraphState, 'edges'>,
  _connector: string,
  edgeColor = '#94a3b8',
): RFEdge[] {
  return Object.values(state.edges).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'labelled',
    label: edge.label,
    data: { edge },
    style: { stroke: edgeColor, strokeWidth: WEIGHT_STROKE[edge.weight ?? 'normal'] },
    markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 16, height: 16 },
  }));
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun run test src/store/graphStore.test.ts src/store/graphStore.persist.test.ts`
Expected: PASS.

- [ ] **Step 8: Typecheck** — the `weight` field is now required on `GraphEdge`; `newEdge` supplies it, and `seed.ts` uses `newEdge`, so it is covered.

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: edge weight field + arrowheads and weight-based stroke in selector" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: LabelledEdge — render arrows/width + weight control

**Files:**
- Modify: `src/canvas/LabelledEdge.tsx`
- Test: `src/canvas/LabelledEdge.test.tsx` (add a case)

**Interfaces:**
- Consumes: `props.style` and `props.markerEnd` (from Task 1's selector), `props.selected`, `useGraphStore().setEdgeWeight`.
- Produces: an edge that draws the selector's stroke + arrowhead, and shows a four-preset weight control when selected.

- [ ] **Step 1: Add the failing test** — append to `src/canvas/LabelledEdge.test.tsx` a new `it` inside the `describe`:

```ts
  it('shows a weight control when the edge is selected and sets the weight', () => {
    const g = useGraphStore.getState();
    const a = g.addNode({ x: 0, y: 0 });
    const b = g.addNode({ x: 300, y: 0 });
    const e = g.connect(a, b)!;

    const nodes = selectFlowNodes(useGraphStore.getState()).map((n) => ({
      ...n,
      width: 210,
      height: 80,
      measured: { width: 210, height: 80 },
    }));
    const edges = selectFlowEdges(useGraphStore.getState(), 'curved').map((ed) => ({
      ...ed,
      selected: true,
    }));

    render(
      <ReactFlowProvider>
        <div style={{ width: 600, height: 300 }}>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={{ flow: FlowNode }} edgeTypes={{ labelled: LabelledEdge }} />
        </div>
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'heavy' }));
    expect(useGraphStore.getState().edges[e].weight).toBe('heavy');
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/canvas/LabelledEdge.test.tsx`
Expected: FAIL — no button named "heavy".

- [ ] **Step 3: Rewrite `src/canvas/LabelledEdge.tsx`** to consume selector styling and add the weight control:

```tsx
import { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import type { RFEdge } from '../store/graphStore';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
import type { EdgeWeight } from '../schema';

const WEIGHTS: EdgeWeight[] = ['thin', 'normal', 'bold', 'heavy'];

export function LabelledEdge(props: EdgeProps<RFEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected } = props;
  const connector = useSettings((s) => s.edges);
  const th = THEMES[useSettings((s) => s.theme)];
  const setEdgeLabel = useGraphStore((s) => s.setEdgeLabel);
  const setEdgeWeight = useGraphStore((s) => s.setEdgeWeight);
  const label = props.data?.edge.label ?? '';
  const weight = props.data?.edge.weight ?? 'normal';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  const geo = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  const [path, labelX, labelY] =
    connector === 'curved'
      ? getBezierPath(geo)
      : connector === 'angular'
        ? getSmoothStepPath(geo)
        : getStraightPath(geo);

  const commit = () => {
    setEditing(false);
    setEdgeLabel(id, draft.trim());
  };

  return (
    <>
      <BaseEdge id={id} path={path} style={props.style} markerEnd={props.markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: labelX, top: labelY, pointerEvents: 'all' }}
        >
          <div className="flex flex-col items-center gap-1">
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                }}
                className="rounded border px-1 text-[10px]"
                style={{ background: th.card, borderColor: th.accent, color: th.text }}
              />
            ) : (
              <button
                onDoubleClick={() => {
                  setDraft(label);
                  setEditing(true);
                }}
                className="rounded px-1 text-[10px]"
                style={{ background: th.canvas, color: label ? th.subtext : th.faint }}
                title="Double-click to edit label"
              >
                {label || '+ label'}
              </button>
            )}

            {selected && (
              <div
                className="flex items-center gap-0.5 rounded border px-1 py-0.5"
                style={{ background: th.card, borderColor: th.cardBorder }}
              >
                {WEIGHTS.map((w) => (
                  <button
                    key={w}
                    aria-label={w}
                    title={w}
                    onClick={() => setEdgeWeight(id, w)}
                    className="rounded px-1"
                    style={{
                      color: weight === w ? th.accent : th.faint,
                      fontWeight: weight === w ? 700 : 400,
                    }}
                  >
                    <span
                      className="block rounded-full"
                      style={{
                        width: 14,
                        height: { thin: 1, normal: 2, bold: 3, heavy: 4 }[w],
                        background: 'currentColor',
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

- [ ] **Step 4: Run the edge tests to verify they pass**

Run: `bun run test src/canvas/LabelledEdge.test.tsx`
Expected: PASS (label-edit case + new weight-control case).

- [ ] **Step 5: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: LabelledEdge renders arrows/width and a weight control when selected" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Undo/redo via zundo

**Files:**
- Modify: `src/store/graphStore.ts`
- Test: `src/store/graphStore.history.test.ts` (create)

**Interfaces:**
- Produces: `useGraphStore.temporal` (a vanilla store with `undo()`, `redo()`, `clear()`, `pause()`, `resume()`, `pastStates`, `futureStates`). No debounce — each tracked `set` is one entry.

- [ ] **Step 1: Install zundo**

```bash
cd /Users/kavinnimalarajan/atomiser/prototype-canvas
bun add zundo
```

- [ ] **Step 2: Write the failing test — `src/store/graphStore.history.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from './graphStore';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});
const s = () => useGraphStore.getState();
const temporal = () => useGraphStore.temporal.getState();

describe('undo/redo', () => {
  it('undo removes a just-added node; redo restores it', () => {
    const id = s().addNode({ title: 'X' });
    expect(s().nodes[id]).toBeDefined();
    temporal().undo();
    expect(s().nodes[id]).toBeUndefined();
    temporal().redo();
    expect(s().nodes[id]).toBeDefined();
  });

  it('undo reverts a status change', () => {
    const id = s().addNode();
    s().setStatus(id, 'done');
    expect(s().nodes[id].status).toBe('done');
    temporal().undo();
    expect(s().nodes[id].status).toBe('todo');
  });

  it('paused mutations are not recorded', () => {
    const id = s().addNode();
    temporal().clear();
    temporal().pause();
    s().moveNode(id, 500, 500);
    temporal().resume();
    expect(temporal().pastStates).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `bun run test src/store/graphStore.history.test.ts`
Expected: FAIL — `useGraphStore.temporal` is undefined.

- [ ] **Step 4: Wrap the store creator in `temporal` in `src/store/graphStore.ts`**

Add the import near the top:

```ts
import { temporal } from 'zundo';
```

Replace the `useGraphStore` creation (the `create<GraphState>()(persist(...))` block) with:

```ts
export const useGraphStore = create<GraphState>()(
  temporal(
    persist(
      (set, get) => ({ ...createInitialState(), ...graphActions(set, get) }),
      {
        name: 'atomiser:graph:v1',
        partialize: (s) => ({ graph: s.graph, nodes: s.nodes, edges: s.edges, layouts: s.layouts }),
      },
    ),
    {
      // Track only the semantic + layout slices; actions/derived are excluded.
      partialize: (s) => ({ graph: s.graph, nodes: s.nodes, edges: s.edges, layouts: s.layouts }),
      limit: 100,
    },
  ),
);
```

- [ ] **Step 5: Run the history test to verify it passes**

Run: `bun run test src/store/graphStore.history.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Run the full suite** (temporal wrapping must not regress existing store tests)

Run: `bun run test`
Expected: PASS (all files).

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`
Expected: no errors. (If `useGraphStore.temporal` is not typed, add `import type { TemporalState } from 'zundo'` is *not* needed — zundo augments the store type through the middleware; the access is typed.)

- [ ] **Step 8: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: undo/redo history via zundo (no debounce, pause-aware)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: History keyboard routing

**Files:**
- Create: `src/canvas/useHistoryShortcuts.ts`
- Test: `src/canvas/useHistoryShortcuts.test.ts`

**Interfaces:**
- Produces: `historyKeyAction(e): 'undo' | 'redo' | null` (pure) and `useHistoryShortcuts(): void` (hook wiring a global keydown to `useGraphStore.temporal`). Routing rule: ⌘/Ctrl+Z → undo, ⌘/Ctrl+Shift+Z or Ctrl+Y → redo; **null when focus is in an `<input>`, `<textarea>`, a contenteditable, or inside `.ProseMirror`** so the editor's own history wins.

- [ ] **Step 1: Write the failing test — `src/canvas/useHistoryShortcuts.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { historyKeyAction } from './useHistoryShortcuts';

type E = Parameters<typeof historyKeyAction>[0];
const ev = (over: Partial<E>): E =>
  ({ key: 'z', metaKey: false, ctrlKey: false, shiftKey: false, target: null, ...over }) as E;

describe('historyKeyAction', () => {
  it('meta+z → undo, meta+shift+z → redo, ctrl+y → redo', () => {
    expect(historyKeyAction(ev({ key: 'z', metaKey: true }))).toBe('undo');
    expect(historyKeyAction(ev({ key: 'z', metaKey: true, shiftKey: true }))).toBe('redo');
    expect(historyKeyAction(ev({ key: 'y', ctrlKey: true }))).toBe('redo');
  });

  it('does nothing without a modifier or for other keys', () => {
    expect(historyKeyAction(ev({ key: 'z' }))).toBeNull();
    expect(historyKeyAction(ev({ key: 'a', metaKey: true }))).toBeNull();
  });

  it('defers to the field when focus is in an input/textarea/contenteditable', () => {
    expect(historyKeyAction(ev({ key: 'z', metaKey: true, target: { tagName: 'INPUT' } }))).toBeNull();
    expect(historyKeyAction(ev({ key: 'z', metaKey: true, target: { tagName: 'TEXTAREA' } }))).toBeNull();
    expect(
      historyKeyAction(ev({ key: 'z', metaKey: true, target: { tagName: 'DIV', isContentEditable: true } })),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/canvas/useHistoryShortcuts.test.ts`
Expected: FAIL — `Cannot find module './useHistoryShortcuts'`.

- [ ] **Step 3: Create `src/canvas/useHistoryShortcuts.ts`**

```ts
import { useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';

type Keyish = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  target: { tagName?: string; isContentEditable?: boolean; closest?: (sel: string) => unknown } | null;
};

export function historyKeyAction(e: Keyish): 'undo' | 'redo' | null {
  if (!e.metaKey && !e.ctrlKey) return null;
  const k = e.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return null;

  const t = e.target;
  if (
    t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.isContentEditable === true ||
      (typeof t.closest === 'function' && t.closest('.ProseMirror')))
  ) {
    return null;
  }

  if (k === 'y' || (k === 'z' && e.shiftKey)) return 'redo';
  return 'undo';
}

export function useHistoryShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = historyKeyAction(e as unknown as Keyish);
      if (!action) return;
      e.preventDefault();
      const temporal = useGraphStore.temporal.getState();
      if (action === 'undo') temporal.undo();
      else temporal.redo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `bun run test src/canvas/useHistoryShortcuts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: keyboard undo/redo routing (defers to focused text fields)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Left toolbar + wiring

**Files:**
- Create: `src/canvas/Toolbar.tsx`
- Modify: `src/canvas/Editor.tsx`, `src/App.tsx`
- Test: `src/canvas/Toolbar.test.tsx`

**Interfaces:**
- Consumes: `useReactFlow()` (fit + `screenToFlowPosition`), `useGraphStore().addNode`, `useGraphStore.temporal`, `useSettings`, `THEMES`, `TYPE_GLYPH`, `historyKeyAction`/`useHistoryShortcuts`.
- Produces: `<Toolbar />` overlaid on the canvas (typed create + undo/redo/fit). `Editor` pauses history during node drag and passes the theme edge colour to the selector. `App` drops the header add-node button and mounts the shortcuts hook.

- [ ] **Step 1: Write the failing test — `src/canvas/Toolbar.test.tsx`**

```tsx
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../store/graphStore';
import { Toolbar } from './Toolbar';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});

describe('Toolbar', () => {
  it('creates a node of the clicked type', () => {
    render(
      <ReactFlowProvider>
        <div style={{ width: 600, height: 400 }}>
          <ReactFlow nodes={[]} edges={[]} />
          <Toolbar />
        </div>
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add decision' }));
    const nodes = Object.values(useGraphStore.getState().nodes);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].nodeType).toBe('decision');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/canvas/Toolbar.test.tsx`
Expected: FAIL — `Cannot find module './Toolbar'`.

- [ ] **Step 3: Create `src/canvas/Toolbar.tsx`**

```tsx
import { useStore } from 'zustand';
import { useReactFlow } from '@xyflow/react';
import type { NodeType } from '../schema';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
import { TYPE_GLYPH } from '../nodes/labels';

const TYPES: NodeType[] = ['task', 'decision', 'milestone', 'constraint'];

export function Toolbar() {
  const rf = useReactFlow();
  const addNode = useGraphStore((s) => s.addNode);
  const th = THEMES[useSettings((s) => s.theme)];
  const canUndo = useStore(useGraphStore.temporal, (t) => t.pastStates.length > 0);
  const canRedo = useStore(useGraphStore.temporal, (t) => t.futureStates.length > 0);

  const create = (nodeType: NodeType) => {
    const p = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    addNode({ nodeType, x: p.x, y: p.y });
  };

  const btn = 'flex h-9 w-9 items-center justify-center rounded text-[15px]';

  return (
    <div
      className="absolute top-3 left-3 z-20 flex flex-col gap-1 rounded-lg border p-1 shadow-md"
      style={{ background: th.panel, borderColor: th.border }}
    >
      {TYPES.map((t) => (
        <button
          key={t}
          aria-label={`Add ${t}`}
          title={`Add ${t}`}
          onClick={() => create(t)}
          className={btn}
          style={{ color: th.text }}
        >
          {TYPE_GLYPH[t]}
        </button>
      ))}
      <div className="my-0.5 h-px" style={{ background: th.border }} />
      <button
        aria-label="Undo"
        title="Undo (⌘Z)"
        disabled={!canUndo}
        onClick={() => useGraphStore.temporal.getState().undo()}
        className={btn}
        style={{ color: canUndo ? th.text : th.faint }}
      >
        ↶
      </button>
      <button
        aria-label="Redo"
        title="Redo (⇧⌘Z)"
        disabled={!canRedo}
        onClick={() => useGraphStore.temporal.getState().redo()}
        className={btn}
        style={{ color: canRedo ? th.text : th.faint }}
      >
        ↷
      </button>
      <button
        aria-label="Fit view"
        title="Fit view"
        onClick={() => rf.fitView({ duration: 300, padding: 0.2 })}
        className={btn}
        style={{ color: th.text }}
      >
        ⤢
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the toolbar test to verify it passes**

Run: `bun run test src/canvas/Toolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the toolbar + drag-pause + edge colour into `src/canvas/Editor.tsx`**

Add imports:

```tsx
import { Toolbar } from './Toolbar';
```

In `Canvas`, add pause/resume callbacks (after the existing `onDoubleClick` callback):

```tsx
  const onNodeDragStart = useCallback(() => useGraphStore.temporal.getState().pause(), []);
  const onNodeDragStop = useCallback(() => useGraphStore.temporal.getState().resume(), []);
```

Change the edges memo to pass the theme edge colour:

```tsx
  const edges = useMemo(() => selectFlowEdges({ edges: edgesRec }, connector, th.edge), [edgesRec, connector, th.edge]);
```

On the `<ReactFlow>` element add the two drag handlers:

```tsx
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
```

Mount the toolbar inside the wrapper `div` (as a sibling of `<ReactFlow>`, before it):

```tsx
      <Toolbar />
```

- [ ] **Step 6: Update `src/App.tsx`** — remove the header add-node button, mount the shortcuts hook, and clear history after seed.

Add import:

```tsx
import { useHistoryShortcuts } from './canvas/useHistoryShortcuts';
```

Call the hook near the top of `App` (after the store selectors):

```tsx
  useHistoryShortcuts();
```

Replace the seed effect with a run-once version that also clears temporal:

```tsx
  useEffect(() => {
    const empty = Object.keys(useGraphStore.getState().nodes).length === 0;
    if (empty && !localStorage.getItem('atomiser:seeded:v1')) {
      loadSeed();
      localStorage.setItem('atomiser:seeded:v1', '1');
    }
    useGraphStore.temporal.getState().clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Remove the header "＋ Add node" button block:

```tsx
          <button
            onClick={() => addNode({ x: 40, y: 40 })}
            className="rounded px-2 py-1"
            style={{ background: th.accent, color: th.onAccent }}
          >
            ＋ Add node
          </button>
```

Then delete the now-unused `addNode` selector line (`const addNode = useGraphStore((s) => s.addNode);`) and the `nodeCount` line if no longer referenced (the run-once effect reads count via `getState`).

- [ ] **Step 7: Typecheck + full test suite + build**

Run: `bun run typecheck && bun run test && bun run build`
Expected: typecheck clean; all tests pass; build succeeds.

- [ ] **Step 8: End-to-end browser verification**

Restart the dev server and drive it (`B="$HOME/.claude/skills/gstack/browse/dist/browse"`):

```bash
lsof -ti:5173 | xargs kill 2>/dev/null; sleep 1
cd /Users/kavinnimalarajan/atomiser/prototype-canvas && (nohup bun run dev >/tmp/vite-a.log 2>&1 &) ; sleep 3
$B goto "http://localhost:5173/"
$B console --errors
$B screenshot /tmp/enh-1.png
```

Confirm manually:
1. Left toolbar renders with four type buttons + undo/redo/fit; edges now show arrowheads.
2. Click "Add decision" → a decision node appears; the Undo button enables.
3. Undo (button and ⌘Z) removes it; Redo restores it.
4. Select an edge → weight presets appear near its label; click the thickest → the edge visibly thickens; reload → weight persists.
5. No app console errors (Vite HMR socket noise is fine).

- [ ] **Step 9: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: left creation/tools toolbar; pause history during drag; drop header add-node" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage (Plan A scope):** undo/redo (Task 3 store + Task 4 keys + Task 5 buttons) ✓; edge arrows (Task 1 selector + Task 2 render) ✓; variable edge width (Task 1 `weight`/`WEIGHT_STROKE`/`setEdgeWeight`, Task 2 control) ✓; left Miro-style toolbar (Task 5) ✓; focus-routed shortcuts (Task 4) ✓; no `GraphOp` for weight (Global Constraints) ✓; documented no-drag-undo cut (Global Constraints, Task 3/5) ✓. (Tiptap rich text + insert row are Plan B — out of scope here.)
- **Type consistency:** `EdgeWeight`, `WEIGHT_STROKE`, `setEdgeWeight`, `weight`, `selectFlowEdges(state, connector, edgeColor)`, `useGraphStore.temporal`, `historyKeyAction`, `useHistoryShortcuts`, `Toolbar` are used identically across tasks. `newEdge` supplies the now-required `weight`, so `seed.ts` and all callers stay valid.
- **Placeholder scan:** every code step is complete; no TBD/TODO. The one runtime note (zundo `.temporal` typing) states the resolution rather than deferring it.
- **Watch-items carried from the spec:** verify `zundo` + `persist` compose (temporal outermost) — the history test (Task 3 Step 6 full-suite) exercises this; if `.temporal` typing fails at Task 3 Step 7, the store still runs and the fix is a localized type import.
