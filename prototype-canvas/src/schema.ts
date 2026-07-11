import { nanoid } from 'nanoid';

export type NodeType = 'task' | 'decision' | 'milestone' | 'constraint';
export type Status = 'todo' | 'in_progress' | 'done' | 'blocked';
export type Origin = 'user' | 'agent';

export type TextBlock = { id: string; type: 'text'; markdown: string };
export type ImageBlock = { id: string; type: 'image'; blobId?: string; src?: string; caption?: string };
export type ChartPoint = { label: string; value: number };
export type ChartBlock = {
  id: string;
  type: 'chart';
  kind: 'bar' | 'line' | 'pie';
  series: ChartPoint[];
  caption?: string;
};
export type Block = TextBlock | ImageBlock | ChartBlock;

export interface GraphNode {
  id: string;
  graphId: string;
  parentId: string | null;
  title: string;
  nodeType: NodeType;
  status: Status;
  body: Block[];
  meta: Record<string, unknown>;
  origin: Origin;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  graphId: string;
  source: string;
  target: string;
  edgeType: 'dependency' | 'constrains';
  label?: string;
  origin: Origin;
  createdAt: string;
}

export interface Layout {
  nodeId: string;
  x: number;
  y: number;
  collapsed: boolean;
}

export interface Graph {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// --- Dormant until Agent mode. Defined now so it drops in without a migration.
//     Keep in 1:1 correspondence with graphStore mutations. ---
export type GraphOp =
  | { op: 'add_node'; node: GraphNode }
  | { op: 'update_node'; id: string; patch: Partial<GraphNode> }
  | { op: 'delete_node'; id: string }
  | { op: 'add_edge'; edge: GraphEdge }
  | { op: 'delete_edge'; id: string }
  | { op: 'set_parent'; id: string; parentId: string | null };

export interface Proposal {
  id: string;
  graphId: string;
  source: 'user_request' | 'agent_review';
  ops: GraphOp[];
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
  createdAt: string;
}

const now = () => new Date().toISOString();

export const GRAPH_ID = 'g_main';

export function newGraph(title = 'Untitled project'): Graph {
  const t = now();
  return { id: GRAPH_ID, title, createdAt: t, updatedAt: t };
}

export function newNode(p: Partial<Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'>> = {}): GraphNode {
  const t = now();
  return {
    id: `n_${nanoid(8)}`,
    graphId: GRAPH_ID,
    parentId: null,
    title: 'New node',
    nodeType: 'task',
    status: 'todo',
    body: [],
    meta: {},
    origin: 'user',
    ...p,
    createdAt: t,
    updatedAt: t,
  };
}

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
    origin: 'user',
    ...p,
    createdAt: now(),
  };
}

export function newTextBlock(markdown = ''): TextBlock {
  return { id: `b_${nanoid(6)}`, type: 'text', markdown };
}

export function newImageBlock(p: Partial<Omit<ImageBlock, 'id' | 'type'>> = {}): ImageBlock {
  return { id: `b_${nanoid(6)}`, type: 'image', ...p };
}

export function newChartBlock(): ChartBlock {
  return {
    id: `b_${nanoid(6)}`,
    type: 'chart',
    kind: 'bar',
    series: [
      { label: 'A', value: 4 },
      { label: 'B', value: 7 },
      { label: 'C', value: 3 },
    ],
  };
}
