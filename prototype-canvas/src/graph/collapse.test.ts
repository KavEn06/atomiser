import { describe, expect, it } from 'vitest';
import { newEdge, newNode, type GraphEdge, type GraphNode, type Layout } from '../schema';
import { boundaryEdges, representativeId, visibleNodes } from './collapse';

function build(spec: { id: string; parent?: string; collapsed?: boolean }[]) {
  const nodes: Record<string, GraphNode> = {};
  const layouts: Record<string, Layout> = {};
  for (const s of spec) {
    nodes[s.id] = { ...newNode({ title: s.id }), id: s.id, parentId: s.parent ?? null };
    layouts[s.id] = { nodeId: s.id, x: 0, y: 0, collapsed: s.collapsed ?? false };
  }
  return { nodes, layouts };
}

const ids = (ns: GraphNode[]) => ns.map((n) => n.id).sort();
const pairs = (es: GraphEdge[]) => es.map((e) => `${e.source}->${e.target}`).sort();

describe('representativeId', () => {
  it('is the node itself when nothing above it is collapsed', () => {
    const { nodes, layouts } = build([{ id: 'p' }, { id: 'c', parent: 'p' }]);
    expect(representativeId('c', nodes, layouts)).toBe('c');
  });

  it('is the collapsed ancestor that hides it', () => {
    const { nodes, layouts } = build([
      { id: 'p', collapsed: true },
      { id: 'c', parent: 'p' },
    ]);
    expect(representativeId('c', nodes, layouts)).toBe('p');
  });

  it('is the outermost collapsed ancestor when groups nest', () => {
    const { nodes, layouts } = build([
      { id: 'top', collapsed: true },
      { id: 'mid', parent: 'top', collapsed: true },
      { id: 'leaf', parent: 'mid' },
    ]);
    expect(representativeId('leaf', nodes, layouts)).toBe('top');
  });

  it('a collapsed node still represents itself', () => {
    const { nodes, layouts } = build([{ id: 'p', collapsed: true }, { id: 'c', parent: 'p' }]);
    expect(representativeId('p', nodes, layouts)).toBe('p');
  });
});

describe('visibleNodes', () => {
  it('hides everything inside a collapsed group', () => {
    const { nodes, layouts } = build([
      { id: 'p', collapsed: true },
      { id: 'a', parent: 'p' },
      { id: 'b', parent: 'p' },
      { id: 'outside' },
    ]);
    expect(ids(visibleNodes(nodes, layouts))).toEqual(['outside', 'p']);
  });

  it('shows children again once the group is expanded', () => {
    const { nodes, layouts } = build([{ id: 'p' }, { id: 'a', parent: 'p' }]);
    expect(ids(visibleNodes(nodes, layouts))).toEqual(['a', 'p']);
  });
});

describe('boundaryEdges', () => {
  it('reattaches a crossing edge to the collapsed group', () => {
    const { nodes, layouts } = build([
      { id: 'up' },
      { id: 'p', collapsed: true },
      { id: 'a', parent: 'p' },
    ]);
    const edges = [newEdge('up', 'a')];
    expect(pairs(boundaryEdges(edges, nodes, layouts))).toEqual(['up->p']);
  });

  it('drops an edge that is entirely inside a collapsed group', () => {
    const { nodes, layouts } = build([
      { id: 'p', collapsed: true },
      { id: 'a', parent: 'p' },
      { id: 'b', parent: 'p' },
    ]);
    expect(boundaryEdges([newEdge('a', 'b')], nodes, layouts)).toEqual([]);
  });

  it('collapses two crossing edges into one connection', () => {
    const { nodes, layouts } = build([
      { id: 'up' },
      { id: 'p', collapsed: true },
      { id: 'a', parent: 'p' },
      { id: 'b', parent: 'p' },
    ]);
    const edges = [newEdge('up', 'a'), newEdge('up', 'b')];
    expect(pairs(boundaryEdges(edges, nodes, layouts))).toEqual(['up->p']);
  });

  it('leaves the edges of a fully expanded graph untouched', () => {
    const { nodes, layouts } = build([{ id: 'a' }, { id: 'b' }]);
    const edges = [newEdge('a', 'b')];
    expect(boundaryEdges(edges, nodes, layouts)).toEqual(edges);
  });
});
