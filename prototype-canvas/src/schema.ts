import { nanoid } from 'nanoid';

export type NodeType = 'task' | 'decision' | 'milestone' | 'constraint';
export type Status = 'todo' | 'in_progress' | 'done' | 'blocked';
export type Origin = 'user' | 'agent';

export type EdgeWeight = 'thin' | 'normal' | 'bold' | 'heavy';

export const WEIGHT_STROKE: Record<EdgeWeight, number> = {
  thin: 1,
  normal: 1.6,
  bold: 2.6,
  heavy: 4,
};

export type TextBlock = { id: string; type: 'text'; html: string; markdown?: string };
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

// --- Type-aware node detail (atomiser.md §2, "expandable nodes"). Stored under
//     `meta.details[nodeType]` — JSONB per §6, one bucket per node type so that
//     changing a node's type hides the old fields instead of destroying them. ---

export const EFFORTS = ['S', 'M', 'L'] as const;
export type Effort = (typeof EFFORTS)[number];

export const HARDNESS = ['hard', 'soft'] as const;
export type Hardness = (typeof HARDNESS)[number];

export type DecisionOption = { id: string; label: string; note: string };
export type Criterion = { id: string; text: string; met: boolean };

export type TaskDetails = { nodeType: 'task'; doneWhen: string; effort: Effort | null };
export type DecisionDetails = {
  nodeType: 'decision';
  options: DecisionOption[];
  chosenId: string | null;
  rationale: string;
};
export type MilestoneDetails = { nodeType: 'milestone'; criteria: Criterion[]; targetDate: string };
export type ConstraintDetails = { nodeType: 'constraint'; hardness: Hardness };

export type DetailsByType = {
  task: TaskDetails;
  decision: DecisionDetails;
  milestone: MilestoneDetails;
  constraint: ConstraintDetails;
};
// Indexing the map by NodeType keeps it exhaustive: add a node type (§14 leaves
// the taxonomy open) and this line stops compiling until the map grows an entry.
export type NodeDetails = DetailsByType[NodeType];

export interface GraphNode {
  id: string;
  graphId: string;
  parentId: string | null;
  title: string;
  /**
   * A short plain-text summary. atomiser.md §6 lists it as a nodes column
   * alongside `meta`, not inside it — `meta` is for domain-specific fields and
   * a summary is universal. Optional because nodes persisted before this field
   * existed have no value for it: read as `node.description ?? ''`.
   */
  description?: string;
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
  weight: EdgeWeight;
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
    weight: 'normal',
    origin: 'user',
    ...p,
    createdAt: now(),
  };
}

export function newTextBlock(html = ''): TextBlock {
  return { id: `b_${nanoid(6)}`, type: 'text', html };
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
