import type { GraphEdge, GraphNode, Layout } from '../schema';

// Collapsing a group (atomiser.md §7). A collapsed parent stands in for
// everything inside it: its children leave the canvas, and edges that crossed
// the boundary reattach to the group itself. That is the simple form of the
// spec's boundary ports — external connections stay stable no matter how the
// internals are arranged, because the outside only ever sees the group.

type Nodes = Record<string, GraphNode>;
type Layouts = Record<string, Layout>;

/**
 * Which node stands in for this one on canvas: itself when everything above it
 * is expanded, otherwise the *outermost* collapsed ancestor hiding it.
 */
export function representativeId(id: string, nodes: Nodes, layouts: Layouts): string {
  let rep = id;
  const seen = new Set<string>();
  let cur = nodes[id]?.parentId;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (layouts[cur]?.collapsed) rep = cur;
    cur = nodes[cur]?.parentId;
  }
  return rep;
}

export function visibleNodes(nodes: Nodes, layouts: Layouts): GraphNode[] {
  return Object.values(nodes).filter((n) => representativeId(n.id, nodes, layouts) === n.id);
}

/**
 * Edges rewritten to the visible graph: endpoints inside a collapsed group move
 * to the group, edges wholly inside it disappear, and parallel crossings merge
 * into a single connection.
 */
export function boundaryEdges(edges: GraphEdge[], nodes: Nodes, layouts: Layouts): GraphEdge[] {
  const out: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const e of edges) {
    const source = representativeId(e.source, nodes, layouts);
    const target = representativeId(e.target, nodes, layouts);
    if (source === target) continue; // internal to a collapsed group
    const key = `${source}->${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source === e.source && target === e.target ? e : { ...e, source, target });
  }
  return out;
}
