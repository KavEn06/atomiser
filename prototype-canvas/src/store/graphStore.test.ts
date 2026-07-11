import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from './graphStore';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
});

const s = () => useGraphStore.getState();

describe('graphStore nodes & edges', () => {
  it('addNode inserts a node and a matching layout, returns its id', () => {
    const id = s().addNode({ title: 'Sensor selection', x: 100, y: 40 });
    expect(s().nodes[id].title).toBe('Sensor selection');
    expect(s().layouts[id]).toEqual({ nodeId: id, x: 100, y: 40, collapsed: false });
  });

  it('renameNode changes the title and bumps updatedAt', () => {
    const id = s().addNode();
    const before = s().nodes[id].updatedAt;
    s().renameNode(id, 'Pump driver');
    expect(s().nodes[id].title).toBe('Pump driver');
    expect(s().nodes[id].updatedAt >= before).toBe(true);
  });

  it('cycleStatus walks todo→in_progress→done→blocked→todo, skipping constraints', () => {
    const id = s().addNode();
    s().cycleStatus(id);
    expect(s().nodes[id].status).toBe('in_progress');
    s().cycleStatus(id);
    s().cycleStatus(id);
    expect(s().nodes[id].status).toBe('blocked');
    s().cycleStatus(id);
    expect(s().nodes[id].status).toBe('todo');

    const c = s().addNode({ nodeType: 'constraint' });
    s().cycleStatus(c);
    expect(s().nodes[c].status).toBe('todo'); // unchanged
  });

  it('connect adds a dependency edge; rejects self-links and duplicates', () => {
    const a = s().addNode();
    const b = s().addNode();
    const e = s().connect(a, b);
    expect(e).not.toBeNull();
    expect(s().edges[e!].edgeType).toBe('dependency');
    expect(s().connect(a, a)).toBeNull();
    expect(s().connect(a, b)).toBeNull(); // duplicate
    expect(Object.keys(s().edges)).toHaveLength(1);
  });

  it('setEdgeLabel sets the label', () => {
    const a = s().addNode();
    const b = s().addNode();
    const e = s().connect(a, b)!;
    s().setEdgeLabel(e, 'rework findings');
    expect(s().edges[e].label).toBe('rework findings');
  });

  it('deleteNode removes the node, its layout, and all connected edges', () => {
    const a = s().addNode();
    const b = s().addNode();
    s().connect(a, b);
    s().deleteNode(a);
    expect(s().nodes[a]).toBeUndefined();
    expect(s().layouts[a]).toBeUndefined();
    expect(Object.keys(s().edges)).toHaveLength(0);
  });

  it('moveNode updates only the layout, not semantics', () => {
    const id = s().addNode({ x: 0, y: 0 });
    s().moveNode(id, 250, 175);
    expect(s().layouts[id].x).toBe(250);
    expect(s().layouts[id].y).toBe(175);
  });

  it('newEdge defaults to normal weight; setEdgeWeight changes it', () => {
    const a = s().addNode();
    const b = s().addNode();
    const e = s().connect(a, b)!;
    expect(s().edges[e].weight).toBe('normal');
    s().setEdgeWeight(e, 'heavy');
    expect(s().edges[e].weight).toBe('heavy');
  });
});
