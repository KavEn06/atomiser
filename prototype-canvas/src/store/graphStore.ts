import { create } from 'zustand';
import {
  newChartBlock,
  newEdge,
  newGraph,
  newImageBlock,
  newNode,
  newTextBlock,
  type Block,
  type Graph,
  type GraphEdge,
  type GraphNode,
  type Layout,
  type NodeType,
  type Status,
} from '../schema';

const STATUS_CYCLE: Status[] = ['todo', 'in_progress', 'done', 'blocked'];
const now = () => new Date().toISOString();

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

  connect: (source: string, target: string) => string | null;
  deleteEdge: (id: string) => void;
  setEdgeLabel: (id: string, label: string) => void;

  addBlock: (nodeId: string, kind: Block['type']) => string;
  updateBlock: (nodeId: string, blockId: string, patch: Partial<Block>) => void;
  deleteBlock: (nodeId: string, blockId: string) => void;
  moveBlock: (nodeId: string, blockId: string, dir: -1 | 1) => void;
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
});

export const useGraphStore = create<GraphState>((set, get) => ({
  ...createInitialState(),
  ...graphActions(set, get),
}));
