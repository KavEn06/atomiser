import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from './graphStore';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});
const s = () => useGraphStore.getState();
const temporal = () => useGraphStore.temporal.getState();

describe('undo/redo', () => {
  it('undo removes a just-added node; redo restores it', () => {
    const id = s().addNode({ title: 'X' });
    expect(s().nodes[id]).toBeDefined();
    temporal().undo();
    expect(s().nodes[id]).toBeUndefined();
    temporal().redo();
    expect(s().nodes[id]).toBeDefined();
  });

  it('undo reverts a status change', () => {
    const id = s().addNode();
    s().setStatus(id, 'done');
    expect(s().nodes[id].status).toBe('done');
    temporal().undo();
    expect(s().nodes[id].status).toBe('todo');
  });

  it('paused mutations are not recorded', () => {
    const id = s().addNode();
    temporal().clear();
    temporal().pause();
    s().moveNode(id, 500, 500);
    temporal().resume();
    expect(temporal().pastStates).toHaveLength(0);
  });
});
