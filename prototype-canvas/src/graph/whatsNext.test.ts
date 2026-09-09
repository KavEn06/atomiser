import { describe, expect, it } from 'vitest';
import { newEdge, newNode, type NodeType, type Status } from '../schema';
import { seedGraph } from '../seed';
import { whatsNext } from './whatsNext';

const mk = (title: string, status: Status, nodeType: NodeType = 'task') =>
  newNode({ title, status, nodeType });

const titles = (items: ReturnType<typeof whatsNext>) => items.map((i) => i.node.title);

describe('whatsNext', () => {
  it('ranks the seed graph: started work first, then by how much it unblocks', () => {
    const { nodes, edges } = seedGraph();
    const next = whatsNext(nodes, edges);

    // Enclosure + Pump are in progress (finish what you started); both unblock
    // 2 downstream nodes so they tie and fall back to title order. Order
    // components is only todo, but unblocks 4.
    expect(titles(next)).toEqual(['Enclosure design', 'Pump driver circuit', 'Order components']);
    expect(next.map((i) => i.unblocks)).toEqual([2, 2, 4]);
  });

  it('excludes done, blocked and constraint nodes', () => {
    const done = mk('Done thing', 'done');
    const blocked = mk('Blocked thing', 'blocked');
    const budget = mk('Budget', 'todo', 'constraint');
    const open = mk('Open thing', 'todo');
    expect(titles(whatsNext([done, blocked, budget, open], []))).toEqual(['Open thing']);
  });

  it('does not surface a node whose dependency is unfinished', () => {
    const a = mk('First', 'in_progress');
    const b = mk('Second', 'todo');
    expect(titles(whatsNext([a, b], [newEdge(a.id, b.id)]))).toEqual(['First']);
  });

  it('surfaces a node once every dependency is done', () => {
    const a = mk('First', 'done');
    const b = mk('Second', 'todo');
    expect(titles(whatsNext([a, b], [newEdge(a.id, b.id)]))).toEqual(['Second']);
  });

  it('treats a constrains edge as context, not a prerequisite', () => {
    const budget = mk('Budget', 'todo', 'constraint');
    const pick = mk('Choose MCU', 'todo', 'decision');
    const edges = [newEdge(budget.id, pick.id, { edgeType: 'constrains' })];
    // The constraint is unfinished, but it does not gate the decision.
    expect(titles(whatsNext([budget, pick], edges))).toEqual(['Choose MCU']);
  });

  it('terminates on a dependency cycle', () => {
    const root = mk('Root', 'todo');
    const a = mk('A', 'todo');
    const b = mk('B', 'todo');
    const edges = [newEdge(root.id, a.id), newEdge(a.id, b.id), newEdge(b.id, a.id)];
    const next = whatsNext([root, a, b], edges);
    expect(titles(next)).toEqual(['Root']);
    expect(next[0].unblocks).toBe(2);
  });

  it('returns nothing for an empty graph', () => {
    expect(whatsNext([], [])).toEqual([]);
  });
});
