import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, selectFlowNodes, useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { FlowNode } from './FlowNode';

const nodeTypes = { flow: FlowNode };

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useUiStore.setState({ selectedNodeId: null });
});

function renderCanvas() {
  return render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={selectFlowNodes(useGraphStore.getState())} edges={[]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>,
  );
}

describe('FlowNode', () => {
  it('renders the title and cycles status when the pill is clicked', () => {
    const id = useGraphStore.getState().addNode({ title: 'Pump driver' });
    renderCanvas();
    expect(screen.getByText('Pump driver')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Click to cycle status'));
    expect(useGraphStore.getState().nodes[id].status).toBe('in_progress');
  });

  it('the expand control opens the node in the ui store', () => {
    const id = useGraphStore.getState().addNode({ title: 'Sensor selection' });
    renderCanvas();
    fireEvent.click(screen.getByLabelText('Expand node'));
    expect(useUiStore.getState().selectedNodeId).toBe(id);
  });
});
