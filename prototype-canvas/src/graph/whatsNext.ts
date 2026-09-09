import type { GraphEdge, GraphNode } from '../schema';

// "What should I work on next?" answered from the real dependency structure
// (atomiser.md §4.6) rather than a hand-kept list.
//
// A node is *actionable* when it is work you could start today: not finished,
// not blocked, and every dependency feeding into it is done. Constraints are
// context, not work, so they never appear — and a `constrains` edge never gates
// anything, it just tells you what to respect while doing it.

export interface NextItem {
  node: GraphNode;
  /** How many nodes downstream are waiting on this one, transitively. */
  unblocks: number;
}

const isDependency = (e: GraphEdge) => e.edgeType === 'dependency';

// Count everything reachable downstream through dependency edges. Seen-set
// guards against cycles: a user can wire A → B → A on the canvas.
function countDescendants(startId: string, out: Map<string, string[]>): number {
  const seen = new Set<string>();
  const stack = [...(out.get(startId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of out.get(id) ?? []) {
      if (!seen.has(next)) stack.push(next);
    }
  }
  return seen.size;
}

export function whatsNext(nodes: GraphNode[], edges: GraphEdge[]): NextItem[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const deps = new Map<string, string[]>(); // target → sources it waits on
  const out = new Map<string, string[]>(); // source → targets waiting on it

  for (const e of edges) {
    if (!isDependency(e) || !byId.has(e.source) || !byId.has(e.target)) continue;
    deps.set(e.target, [...(deps.get(e.target) ?? []), e.source]);
    out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  }

  const actionable = nodes.filter((n) => {
    if (n.nodeType === 'constraint') return false;
    if (n.status === 'done' || n.status === 'blocked') return false;
    return (deps.get(n.id) ?? []).every((id) => byId.get(id)?.status === 'done');
  });

  return actionable
    .map((node) => ({ node, unblocks: countDescendants(node.id, out) }))
    .sort(
      (a, b) =>
        // Finish what you've started, then clear the biggest logjam, then keep
        // the order stable so the list doesn't shuffle between renders.
        Number(b.node.status === 'in_progress') - Number(a.node.status === 'in_progress') ||
        b.unblocks - a.unblocks ||
        a.node.title.localeCompare(b.node.title),
    );
}
