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

  // A group summarises the work inside it (§7): status is derived, not clickable.
  function makeGroup() {
    const g = useGraphStore.getState();
    const a = g.addNode({ title: 'Toolchain' });
    const b = g.addNode({ title: 'Board config' });
    g.setStatus(a, 'done');
    g.setStatus(b, 'blocked');
    return { parent: g.group([a, b])!, a, b };
  }

  it('a group shows its rolled-up status and progress instead of a status button', () => {
    makeGroup();
    renderCanvas();
    const summary = screen.getByTitle("Rolled up from this group's contents");
    expect(summary).toHaveTextContent('Blocked');
    expect(summary).toHaveTextContent('1/2 done');
    // The two children keep their own clickable pills; the group does not.
    expect(screen.getAllByTitle('Click to cycle status')).toHaveLength(2);
  });

  it('collapsing a group hides its children and expanding brings them back', () => {
    const { parent } = makeGroup();
    const { rerender } = renderCanvas();
    expect(screen.getByText('Toolchain')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Collapse group'));
    expect(useGraphStore.getState().layouts[parent].collapsed).toBe(true);

    const canvas = (
      <ReactFlowProvider>
        <div style={{ width: 800, height: 600 }}>
          <ReactFlow nodes={selectFlowNodes(useGraphStore.getState())} edges={[]} nodeTypes={nodeTypes} />
        </div>
      </ReactFlowProvider>
    );
    rerender(canvas);
    expect(screen.queryByText('Toolchain')).not.toBeInTheDocument();
    expect(screen.getByText('New group')).toBeInTheDocument();
  });

  // body has never been read outside the drawer, so a node full of notes looked
  // identical to an empty one on the canvas.
  it('marks a node that has something inside it', () => {
    const id = useGraphStore.getState().addNode({ title: 'Enclosure design' });
    const { rerender } = renderCanvas();
    expect(screen.queryByTitle('Has details')).not.toBeInTheDocument();

    useGraphStore.getState().updateNode(id, { description: 'FDM, 3 walls' });
    rerender(
      <ReactFlowProvider>
        <div style={{ width: 800, height: 600 }}>
          <ReactFlow nodes={selectFlowNodes(useGraphStore.getState())} edges={[]} nodeTypes={nodeTypes} />
        </div>
      </ReactFlowProvider>,
    );
    expect(screen.getByTitle('Has details')).toBeInTheDocument();
  });

  it('marks a node that holds a block', () => {
    const id = useGraphStore.getState().addNode({ title: 'Firmware' });
    useGraphStore.getState().addBlock(id, 'text');
    renderCanvas();
    expect(screen.getByTitle('Has details')).toBeInTheDocument();
  });
});