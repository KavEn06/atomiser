import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, selectFlowEdges, selectFlowNodes, useGraphStore } from '../store/graphStore';
import { LabelledEdge } from './LabelledEdge';
import { FlowNode } from '../nodes/FlowNode';

const nodeTypes = { flow: FlowNode };
const edgeTypes = { labelled: LabelledEdge };

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
});

describe('LabelledEdge', () => {
  it('renders the label and edits it on double-click', () => {
    const g = useGraphStore.getState();
    const a = g.addNode({ x: 0, y: 0 });
    const b = g.addNode({ x: 300, y: 0 });
    const e = g.connect(a, b)!;
    g.setEdgeLabel(e, 'depends on');

    // Give nodes explicit measured dimensions so React Flow renders edges in jsdom.
    const nodes = selectFlowNodes(useGraphStore.getState()).map((n) => ({
      ...n,
      width: 210,
      height: 80,
      measured: { width: 210, height: 80 },
    }));

    render(
      <ReactFlowProvider>
        <div style={{ width: 600, height: 300 }}>
          <ReactFlow
            nodes={nodes}
            edges={selectFlowEdges(useGraphStore.getState(), 'curved')}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
          />
        </div>
      </ReactFlowProvider>,
    );

    fireEvent.doubleClick(screen.getByText('depends on'));
    const input = screen.getByDisplayValue('depends on') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'gates' } });
    fireEvent.blur(input);
    expect(useGraphStore.getState().edges[e].label).toBe('gates');
  });
});
