import { describe, expect, it } from 'vitest';
import { computeLayout } from './autoLayout';
import { newEdge, newNode } from '../schema';

describe('computeLayout', () => {
  it('lays a dependency chain left-to-right (downstream nodes further right)', () => {
    const a = newNode({ title: 'A' });
    const b = newNode({ title: 'B' });
    const c = newNode({ title: 'C' });
    const pos = computeLayout([a, b, c], [newEdge(a.id, b.id), newEdge(b.id, c.id)]);
    expect(pos[a.id].x).toBeLessThan(pos[b.id].x);
    expect(pos[b.id].x).toBeLessThan(pos[c.id].x);
  });

  it('returns a position for every node, including orphans', () => {
    const a = newNode();
    const orphan = newNode();
    const pos = computeLayout([a, orphan], []);
    expect(pos[a.id]).toBeDefined();
    expect(pos[orphan.id]).toBeDefined();
  });

  it('tolerates edges whose endpoints are missing from the node list', () => {
    const a = newNode();
    const pos = computeLayout([a], [newEdge(a.id, 'ghost')]);
    expect(pos[a.id]).toBeDefined();
  });
});
