import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../../store/graphStore';
import type { ChartBlock as ChartBlockT } from '../../schema';
import { ChartBlock } from './ChartBlock';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
});

describe('ChartBlock', () => {
  it('switches kind and adds a data row', () => {
    const id = useGraphStore.getState().addNode();
    useGraphStore.getState().addBlock(id, 'chart');
    const block = useGraphStore.getState().nodes[id].body[0] as ChartBlockT;
    render(<ChartBlock nodeId={id} block={block} />);
    fireEvent.click(screen.getByRole('button', { name: 'line' }));
    expect((useGraphStore.getState().nodes[id].body[0] as ChartBlockT).kind).toBe('line');
  });
});
