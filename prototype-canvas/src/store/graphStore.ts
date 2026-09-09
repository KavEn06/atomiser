import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { MarkerType } from '@xyflow/react';
import type { Edge as RFEdgeBase, Node as RFNodeBase } from '@xyflow/react';
import { seedGraph } from '../seed';
import { boundaryEdges, visibleNodes } from '../graph/collapse';
import { buildChildIndex, rollupOf, type Rollup } from '../graph/rollup';
import {
  newChartBlock,
  newEdge,
  newGraph,
  newImageBlock,
  newNode,
  newTextBlock,
  WEIGHT_STROKE,
  type Block,
  type EdgeWeight,
  type Graph,
  type GraphEdge,
  type GraphNode,
  type Layout,
  type NodeType,
  type Status,
} from '../schema';

const STATUS_CYCLE: Status[] = ['todo', 'in_progress', 'done', 'blocked'];
const now = () => new Date().toISOString();

// Walk up the parent chain. Used to keep the hierarchy a tree: a node may never
// end up inside itself. The seen-set keeps a malformed chain from looping.
function hasAncestor(
  nodes: Record<string, GraphNode>,
  id: string,
  ancestorId: string,
): boolean {
  const seen = new Set<string>();
  let cur = nodes[id]?.parentId;
  while (cur && !seen.has(cur)) {
    if (cur === ancestorId) return true;
    seen.add(cur);
    cur = nodes[cur]?.parentId;
  }
  return false;
}

export interface GraphState {
  graph: Graph;
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  layouts: Record<string, Layout>;

  addNode: (p?: { title?: string; nodeType?: NodeType; x?: number; y?: number }) => string;
  updateNode: (
    id: string,
    patch: Partial<Pick<GraphNode, 'title' | 'nodeType' | 'status' | 'meta' | 'body'>>,
  ) => void;
  deleteNode: (id: string) => void;
  renameNode: (id: string, title: string) => void;
  setStatus: (id: string, status: Status) => void;
  cycleStatus: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  setLayouts: (positions: Record<string, { x: number; y: number }>) => void;

  setParent: (id: string, parentId: string | null) => void;
  group: (ids: string[]) => string | null;
  ungroup: (parentId: string) => void;
  toggleCollapse: (id: string) => void;

  connect: (source: string, target: string) => string | null;
  deleteEdge: (id: string) => void;
  setEdgeLabel: (id: string, label: string) => void;
  setEdgeWeight: (id: string, weight: EdgeWeight) => void;

  addBlock: (nodeId: string, kind: Block['type']) => string;
  updateBlock: (nodeId: string, blockId: string, patch: Partial<Block>) => void;
  deleteBlock: (nodeId: string, blockId: string) => void;
  moveBlock: (nodeId: string, blockId: string, dir: -1 | 1) => void;

  clearGraph: () => void;
  loadSeed: () => void;
}

export function createInitialState() {
  return { graph: newGraph('Smart hydroponics controller'), nodes: {}, edges: {}, layouts: {} };
}

// Actions are defined against (set, get) so both the plain store and the
// persisted store (Task 4) reuse them.
export const graphActions = (
  set: (fn: (s: GraphState) => Partial<GraphState>) => void,
  get: () => GraphState,
): Omit<GraphState, 'graph' | 'nodes' | 'edges' | 'layouts'> => ({
  addNode: (p = {}) => {
    const node = newNode({ title: p.title ?? 'New node', nodeType: p.nodeType ?? 'task' });
    const layout: Layout = { nodeId: node.id, x: p.x ?? 0, y: p.y ?? 0, collapsed: false };
    set((s) => ({
      nodes: { ...s.nodes, [node.id]: node },
      layouts: { ...s.layouts, [node.id]: layout },
    }));
    return node.id;
  },

  updateNode: (id, patch) =>
    set((s) => {
      const n = s.nodes[id];
      if (!n) return {};
      return { nodes: { ...s.nodes, [id]: { ...n, ...patch, updatedAt: now() } } };
    }),

  deleteNode: (id) =>
    set((s) => {
      const nodes = { ...s.nodes };
      const layouts = { ...s.layouts };
      // Children outlive their parent — promote them rather than leaving them
      // pointing at a node that no longer exists.
      const orphaned = s.nodes[id]?.parentId ?? null;
      for (const n of Object.values(s.nodes)) {
        if (n.parentId === id) nodes[n.id] = { ...n, parentId: orphaned, updatedAt: now() };
      }
      delete nodes[id];
      delete layouts[id];
      const edges = Object.fromEntries(
        Object.entries(s.edges).filter(([, e]) => e.source !== id && e.target !== id),
      );
      return { nodes, layouts, edges };
    }),

  renameNode: (id, title) => get().updateNode(id, { title }),

  setStatus: (id, status) =>
    set((s) => {
      const n = s.nodes[id];
      if (!n || n.nodeType === 'constraint') return {};
      return { nodes: { ...s.nodes, [id]: { ...n, status, updatedAt: now() } } };
    }),

  cycleStatus: (id) => {
    const n = get().nodes[id];
    if (!n || n.nodeType === 'constraint') return;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(n.status) + 1) % STATUS_CYCLE.length];
    get().setStatus(id, next);
  },

  moveNode: (id, x, y) =>
    set((s) => {
      const l = s.layouts[id];
      if (!l) return {};
      return { layouts: { ...s.layouts, [id]: { ...l, x, y } } };
    }),

  setLayouts: (positions) =>
    set((s) => {
      const layouts = { ...s.layouts };
      for (const [id, pos] of Object.entries(positions)) {
        const l = layouts[id];
        if (l) layouts[id] = { ...l, x: pos.x, y: pos.y };
      }
      return { layouts };
    }),

  // --- Hierarchy (atomiser.md §7). Optional everywhere: a flat graph is a
  //     perfectly good graph, this is only for when a node feels too big. ---

  setParent: (id, parentId) =>
    set((s) => {
      const n = s.nodes[id];
      if (!n || id === parentId) return {};
      if (parentId && (!s.nodes[parentId] || hasAncestor(s.nodes, parentId, id))) return {};
      return { nodes: { ...s.nodes, [id]: { ...n, parentId, updatedAt: now() } } };
    }),

  group: (ids) => {
    const state = get();
    const present = ids.filter((id) => state.nodes[id]);
    // Anything already inside another member of the selection stays where it
    // is — grouping a node and its own child shouldn't flatten them together.
    const top = present.filter(
      (id) => !present.some((other) => other !== id && hasAncestor(state.nodes, id, other)),
    );
    if (top.length < 2) return null;

    const parent = newNode({ title: 'New group', nodeType: 'task' });
    // The group is born where its members already are, and inherits their
    // parent so grouping inside a group nests rather than escapes.
    parent.parentId = state.nodes[top[0]].parentId;
    const pts = top.map((id) => state.layouts[id]).filter(Boolean);
    const at = (k: 'x' | 'y') =>
      pts.length > 0 ? pts.reduce((sum, l) => sum + l[k], 0) / pts.length : 0;

    set((s) => {
      const nodes = { ...s.nodes, [parent.id]: parent };
      for (const id of top) nodes[id] = { ...s.nodes[id], parentId: parent.id, updatedAt: now() };
      return {
        nodes,
        layouts: {
          ...s.layouts,
          [parent.id]: { nodeId: parent.id, x: at('x'), y: at('y'), collapsed: false },
        },
      };
    });
    return parent.id;
  },

  toggleCollapse: (id) =>
    set((s) => {
      const l = s.layouts[id];
      if (!l) return {};
      return { layouts: { ...s.layouts, [id]: { ...l, collapsed: !l.collapsed } } };
    }),

  ungroup: (parentId) =>
    set((s) => {
      const parent = s.nodes[parentId];
      if (!parent) return {};
      const nodes = { ...s.nodes };
      for (const n of Object.values(s.nodes)) {
        // Children rise to wherever the group itself lived.
        if (n.parentId === parentId) nodes[n.id] = { ...n, parentId: parent.parentId, updatedAt: now() };
      }
      delete nodes[parentId];
      const layouts = { ...s.layouts };
      delete layouts[parentId];
      const edges = Object.fromEntries(
        Object.entries(s.edges).filter(([, e]) => e.source !== parentId && e.target !== parentId),
      );
      return { nodes, layouts, edges };
    }),

  connect: (source, target) => {
    if (source === target) return null;
    const dupe = Object.values(get().edges).some((e) => e.source === source && e.target === target);
    if (dupe) return null;
    const edge = newEdge(source, target);
    set((s) => ({ edges: { ...s.edges, [edge.id]: edge } }));
    return edge.id;
  },

  deleteEdge: (id) =>
    set((s) => {
      const edges = { ...s.edges };
      delete edges[id];
      return { edges };
    }),

  setEdgeLabel: (id, label) =>
    set((s) => {
      const e = s.edges[id];
      if (!e) return {};
      return { edges: { ...s.edges, [id]: { ...e, label } } };
    }),

  setEdgeWeight: (id, weight) =>
    set((s) => {
      const e = s.edges[id];
      if (!e) return {};
      return { edges: { ...s.edges, [id]: { ...e, weight } } };
    }),

  addBlock: (nodeId, kind) => {
    const block =
      kind === 'text' ? newTextBlock() : kind === 'image' ? newImageBlock() : newChartBlock();
    set((s) => {
      const n = s.nodes[nodeId];
      if (!n) return {};
      return { nodes: { ...s.nodes, [nodeId]: { ...n, body: [...n.body, block], updatedAt: now() } } };
    });
    return block.id;
  },

  updateBlock: (nodeId, blockId, patch) =>
    set((s) => {
      const n = s.nodes[nodeId];
      if (!n) return {};
      const body = n.body.map((b) => (b.id === blockId ? ({ ...b, ...patch } as Block) : b));
      return { nodes: { ...s.nodes, [nodeId]: { ...n, body, updatedAt: now() } } };
    }),

  deleteBlock: (nodeId, blockId) =>
    set((s) => {
      const n = s.nodes[nodeId];
      if (!n) return {};
      return {
        nodes: {
          ...s.nodes,
          [nodeId]: { ...n, body: n.body.filter((b) => b.id !== blockId), updatedAt: now() },
        },
      };
    }),

  moveBlock: (nodeId, blockId, dir) =>
    set((s) => {
      const n = s.nodes[nodeId];
      if (!n) return {};
      const i = n.body.findIndex((b) => b.id === blockId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= n.body.length) return {};
      const body = [...n.body];
      [body[i], body[j]] = [body[j], body[i]];
      return { nodes: { ...s.nodes, [nodeId]: { ...n, body, updatedAt: now() } } };
    }),

  clearGraph: () => set(() => ({ nodes: {}, edges: {}, layouts: {} })),

  loadSeed: () => {
    const { nodes, edges, layouts } = seedGraph();
    set(() => ({
      nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
      edges: Object.fromEntries(edges.map((e) => [e.id, e])),
      layouts: Object.fromEntries(layouts.map((l) => [l.nodeId, l])),
    }));
  },
});

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
      // No debounce — the canvas pauses history during drags, so each discrete
      // edit is exactly one entry.
      partialize: (s) => ({ graph: s.graph, nodes: s.nodes, edges: s.edges, layouts: s.layouts }),
      limit: 100,
    },
  ),
);

// --- Pure selectors: store shape → React Flow arrays ---

export type FlowNodeData = { node: GraphNode; rollup: Rollup | null; collapsed: boolean };
export type FlowEdgeData = { edge: GraphEdge };
export type RFNode = RFNodeBase<FlowNodeData, 'flow'>;
export type RFEdge = RFEdgeBase<FlowEdgeData>;

// Only what the canvas should show: anything inside a collapsed group is
// represented by the group itself. Parents carry their rollup so the node can
// render "blocked · 1/3 done" instead of a hand-set status.
export function selectFlowNodes(state: Pick<GraphState, 'nodes' | 'layouts'>): RFNode[] {
  const children = buildChildIndex(Object.values(state.nodes));
  return visibleNodes(state.nodes, state.layouts).map((node) => {
    const l = state.layouts[node.id];
    return {
      id: node.id,
      type: 'flow',
      position: { x: l?.x ?? 0, y: l?.y ?? 0 },
      data: { node, rollup: rollupOf(node, children), collapsed: l?.collapsed ?? false },
    };
  });
}

export function selectFlowEdges(
  state: Pick<GraphState, 'edges' | 'nodes' | 'layouts'>,
  _connector: string,
  edgeColor = '#94a3b8',
): RFEdge[] {
  const edges = boundaryEdges(Object.values(state.edges), state.nodes, state.layouts);
  return edges.map((edge) => ({
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
