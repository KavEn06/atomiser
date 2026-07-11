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
