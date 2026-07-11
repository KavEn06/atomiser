import { beforeEach, describe, expect, it } from 'vitest';
import type { ChartBlock, TextBlock } from '../schema';
import { createInitialState, useGraphStore } from './graphStore';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
});
const s = () => useGraphStore.getState();

describe('graphStore blocks', () => {
  it('addBlock appends a block of the requested kind and returns its id', () => {
    const n = s().addNode();
    const b = s().addBlock(n, 'text');
    const body = s().nodes[n].body;
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(b);
    expect(body[0].type).toBe('text');
  });

  it('updateBlock merges a patch while preserving the discriminant', () => {
    const n = s().addNode();
    const b = s().addBlock(n, 'text');
    s().updateBlock(n, b, { html: '<p>Notes</p>' } as Partial<TextBlock>);
    expect((s().nodes[n].body[0] as TextBlock).html).toBe('<p>Notes</p>');
  });

  it('updateBlock can change a chart kind and series', () => {
    const n = s().addNode();
    const b = s().addBlock(n, 'chart');
    s().updateBlock(n, b, { kind: 'line', series: [{ label: 'x', value: 9 }] } as Partial<ChartBlock>);
    const block = s().nodes[n].body[0] as ChartBlock;
    expect(block.kind).toBe('line');
    expect(block.series).toEqual([{ label: 'x', value: 9 }]);
  });

  it('moveBlock reorders within bounds and no-ops at the edges', () => {
    const n = s().addNode();
    const first = s().addBlock(n, 'text');
    const second = s().addBlock(n, 'chart');
    s().moveBlock(n, second, -1);
    expect(s().nodes[n].body.map((x) => x.id)).toEqual([second, first]);
    s().moveBlock(n, second, -1); // already first, no-op
    expect(s().nodes[n].body.map((x) => x.id)).toEqual([second, first]);
  });

  it('deleteBlock removes the block', () => {
    const n = s().addNode();
    const b = s().addBlock(n, 'image');
    s().deleteBlock(n, b);
    expect(s().nodes[n].body).toHaveLength(0);
  });
});
