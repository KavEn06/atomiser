import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from './graphStore';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});
const s = () => useGraphStore.getState();

describe('graphStore hierarchy', () => {
  it('nodes start with no parent', () => {
    const id = s().addNode();
    expect(s().nodes[id].parentId).toBeNull();
  });

  it('setParent assigns and clears a parent', () => {
    const p = s().addNode();
    const c = s().addNode();
    s().setParent(c, p);
    expect(s().nodes[c].parentId).toBe(p);
    s().setParent(c, null);
    expect(s().nodes[c].parentId).toBeNull();
  });

  it('setParent refuses to make a node its own ancestor', () => {
    const a = s().addNode();
    const b = s().addNode();
    s().setParent(b, a);
    s().setParent(a, b); // would form a cycle
    expect(s().nodes[a].parentId).toBeNull();
    s().setParent(a, a);
    expect(s().nodes[a].parentId).toBeNull();
  });

  it('group puts a new parent over the selection and centres it on them', () => {
    const a = s().addNode({ x: 0, y: 0 });
    const b = s().addNode({ x: 100, y: 50 });
    const parent = s().group([a, b])!;
    expect(parent).toBeTruthy();
    expect(s().nodes[a].parentId).toBe(parent);
    expect(s().nodes[b].parentId).toBe(parent);
    expect(s().nodes[parent].parentId).toBeNull();
    expect(s().layouts[parent]).toMatchObject({ x: 50, y: 25 });
  });

  it('group needs at least two nodes', () => {
    const a = s().addNode();
    expect(s().group([a])).toBeNull();
    expect(s().group([])).toBeNull();
  });

  it('group nests under a shared parent rather than escaping it', () => {
    const outer = s().addNode();
    const a = s().addNode();
    const b = s().addNode();
    s().setParent(a, outer);
    s().setParent(b, outer);
    const inner = s().group([a, b])!;
    expect(s().nodes[inner].parentId).toBe(outer);
  });

  it('group ignores a node whose ancestor is also selected', () => {
    const a = s().addNode();
    const child = s().addNode();
    const b = s().addNode();
    s().setParent(child, a);
    const parent = s().group([a, child, b])!;
    expect(s().nodes[a].parentId).toBe(parent);
    expect(s().nodes[b].parentId).toBe(parent);
    // child stays under a — it was already inside the selection
    expect(s().nodes[child].parentId).toBe(a);
  });

  it('ungroup promotes children and removes the parent', () => {
    const a = s().addNode();
    const b = s().addNode();
    const parent = s().group([a, b])!;
    s().ungroup(parent);
    expect(s().nodes[parent]).toBeUndefined();
    expect(s().nodes[a].parentId).toBeNull();
    expect(s().nodes[b].parentId).toBeNull();
  });

  it('ungroup hands children back to the grandparent', () => {
    const outer = s().addNode();
    const a = s().addNode();
    const b = s().addNode();
    s().setParent(a, outer);
    s().setParent(b, outer);
    const inner = s().group([a, b])!;
    s().ungroup(inner);
    expect(s().nodes[a].parentId).toBe(outer);
    expect(s().nodes[b].parentId).toBe(outer);
  });

  it('deleting a parent promotes its children instead of orphaning them', () => {
    const a = s().addNode();
    const b = s().addNode();
    const parent = s().group([a, b])!;
    s().deleteNode(parent);
    expect(s().nodes[a].parentId).toBeNull();
    expect(s().nodes[b].parentId).toBeNull();
  });

  it('grouping is a single undo step', () => {
    const a = s().addNode({ x: 0, y: 0 });
    const b = s().addNode({ x: 100, y: 0 });
    const before = Object.keys(s().nodes).length;
    s().group([a, b]);
    expect(Object.keys(s().nodes).length).toBe(before + 1);
    useGraphStore.temporal.getState().undo();
    expect(Object.keys(s().nodes).length).toBe(before);
    expect(s().nodes[a].parentId).toBeNull();
  });
});
