import type { GraphNode, Status } from '../schema';

// Status rollup (atomiser.md §7). A parent's status is *derived*, never
// hand-set: the collapsed node is a summary of the work inside it, so the
// top-level graph stays an honest dashboard with zero maintenance.

export interface Rollup {
  status: Status;
  /** Children finished, by their own derived status. */
  done: number;
  total: number;
}

export function rollupStatuses(statuses: Status[]): Status {
  if (statuses.length === 0) return 'todo';
  if (statuses.every((s) => s === 'done')) return 'done';
  if (statuses.some((s) => s === 'blocked')) return 'blocked';
  if (statuses.some((s) => s === 'done' || s === 'in_progress')) return 'in_progress';
  return 'todo';
}

export type ChildIndex = Map<string, GraphNode[]>;

export function buildChildIndex(nodes: GraphNode[]): ChildIndex {
  const idx: ChildIndex = new Map();
  for (const n of nodes) {
    if (!n.parentId) continue;
    idx.set(n.parentId, [...(idx.get(n.parentId) ?? []), n]);
  }
  return idx;
}

// A leaf reports the status the user set. A parent reports what its children
// add up to — recursively, so a grandparent sees through intermediate levels.
// `seen` guards a malformed hierarchy from recursing forever.
export function effectiveStatus(
  node: GraphNode,
  children: ChildIndex,
  seen: Set<string> = new Set(),
): Status {
  const kids = children.get(node.id);
  if (!kids || kids.length === 0 || seen.has(node.id)) return node.status;
  seen.add(node.id);
  return rollupStatuses(kids.map((k) => effectiveStatus(k, children, seen)));
}

/** The summary a collapsed parent shows ("blocked · 1/3 done"), or null for a leaf. */
export function rollupOf(node: GraphNode, children: ChildIndex): Rollup | null {
  const kids = children.get(node.id);
  if (!kids || kids.length === 0) return null;
  const statuses = kids.map((k) => effectiveStatus(k, children));
  return {
    status: rollupStatuses(statuses),
    done: statuses.filter((s) => s === 'done').length,
    total: kids.length,
  };
}
