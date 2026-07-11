import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../store/graphStore';
import { Toolbar } from './Toolbar';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});

describe('Toolbar', () => {
  it('creates a node of the clicked type', () => {
    render(
      <ReactFlowProvider>
        <div style={{ width: 600, height: 400 }}>
          <ReactFlow nodes={[]} edges={[]} />
          <Toolbar />
        </div>
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add decision' }));
    const nodes = Object.values(useGraphStore.getState().nodes);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].nodeType).toBe('decision');
  });
});
