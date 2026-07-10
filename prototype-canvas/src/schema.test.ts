import { describe, expect, it } from 'vitest';
import {
  newChartBlock,
  newEdge,
  newGraph,
  newImageBlock,
  newNode,
  newTextBlock,
} from './schema';

describe('factories', () => {
  it('newNode has a stable-shaped id, defaults, empty body, and user origin', () => {
    const n = newNode();
    expect(n.id).toMatch(/^n_/);
    expect(n.nodeType).toBe('task');
    expect(n.status).toBe('todo');
    expect(n.parentId).toBeNull();
    expect(n.body).toEqual([]);
    expect(n.origin).toBe('user');
    expect(new Date(n.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('newNode accepts overrides', () => {
    const n = newNode({ title: 'Sensor selection', nodeType: 'milestone', status: 'done' });
    expect(n.title).toBe('Sensor selection');
    expect(n.nodeType).toBe('milestone');
    expect(n.status).toBe('done');
  });

  it('newEdge links two nodes with dependency type + user origin', () => {
    const e = newEdge('n_a', 'n_b');
    expect(e.id).toMatch(/^e_/);
    expect(e.source).toBe('n_a');
    expect(e.target).toBe('n_b');
    expect(e.edgeType).toBe('dependency');
    expect(e.origin).toBe('user');
  });

  it('block factories carry a unique id and correct discriminant', () => {
    expect(newTextBlock().type).toBe('text');
    expect(newImageBlock({ src: 'https://x/y.png' }).src).toBe('https://x/y.png');
    const c = newChartBlock();
    expect(c.type).toBe('chart');
    expect(c.kind).toBe('bar');
    expect(c.series.length).toBeGreaterThan(0);
  });

  it('newGraph uses the fixed graph id', () => {
    expect(newGraph('X').id).toBe('g_main');
  });
});
