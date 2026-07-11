import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, selectFlowEdges, selectFlowNodes, useGraphStore } from './graphStore';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
});
const s = () => useGraphStore.getState();

describe('persistence + seed + selectors', () => {
  it('loadSeed fills the graph; clearGraph empties nodes/edges/layouts', () => {
    s().loadSeed();
    expect(Object.keys(s().nodes).length).toBe(11);
    expect(Object.keys(s().edges).length).toBe(13);
    s().clearGraph();
    expect(Object.keys(s().nodes)).toHaveLength(0);
    expect(Object.keys(s().edges)).toHaveLength(0);
    expect(Object.keys(s().layouts)).toHaveLength(0);
  });

  it('writes state to localStorage under atomiser:graph:v1', () => {
    s().addNode({ title: 'persisted' });
    const raw = localStorage.getItem('atomiser:graph:v1');
    expect(raw).toBeTruthy();
    expect(raw!).toContain('persisted');
  });

  it('selectFlowNodes maps store + layout into React Flow nodes', () => {
    const id = s().addNode({ title: 'A', x: 12, y: 34 });
    const rf = selectFlowNodes(s());
    expect(rf).toHaveLength(1);
    expect(rf[0]).toMatchObject({ id, type: 'flow', position: { x: 12, y: 34 } });
    expect(rf[0].data.node.title).toBe('A');
  });

  it('selectFlowEdges maps store edges and passes the connector type', () => {
    const a = s().addNode();
    const b = s().addNode();
    const e = s().connect(a, b)!;
    const rf = selectFlowEdges(s(), 'angular');
    expect(rf[0]).toMatchObject({ id: e, source: a, target: b, type: 'labelled' });
  });
});
