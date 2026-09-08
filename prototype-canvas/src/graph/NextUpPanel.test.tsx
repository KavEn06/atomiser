import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { seedGraph } from '../seed';
import { NextUpPanel } from './NextUpPanel';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
  useUiStore.setState({ selectedNodeId: null, nextOpen: true });
});

const mount = () =>
  render(
    <ReactFlowProvider>
      <div style={{ width: 600, height: 400 }}>
        <ReactFlow nodes={[]} edges={[]} />
        <NextUpPanel />
      </div>
    </ReactFlowProvider>,
  );

// Load the sample graph through the store so the panel reads real state.
function loadSeed() {
  const { nodes, edges, layouts } = seedGraph();
  useGraphStore.setState({
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    edges: Object.fromEntries(edges.map((e) => [e.id, e])),
    layouts: Object.fromEntries(layouts.map((l) => [l.nodeId, l])),
  });
}

describe('NextUpPanel', () => {
  it('renders nothing when closed', () => {
    useUiStore.setState({ nextOpen: false });
    loadSeed();
    mount();
    expect(screen.queryByRole('heading', { name: 'Up next' })).not.toBeInTheDocument();
  });

  it('lists actionable work in rank order', () => {
    loadSeed();
    mount();
    const items = screen.getAllByRole('button', { name: /unblocks/ });
    expect(items.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Enclosure design'),
      expect.stringContaining('Pump driver circuit'),
      expect.stringContaining('Order components'),
    ]);
  });

  it('opens the node it is told to work on', () => {
    loadSeed();
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: /unblocks/ })[0]);
    const selected = useUiStore.getState().selectedNodeId;
    expect(selected).not.toBeNull();
    expect(useGraphStore.getState().nodes[selected!].title).toBe('Enclosure design');
  });

  it('explains itself when nothing is ready to start', () => {
    mount();
    expect(screen.getByText(/nothing is ready to start/i)).toBeInTheDocument();
  });

  it('closes from its own button', () => {
    loadSeed();
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Close up next' }));
    expect(useUiStore.getState().nextOpen).toBe(false);
  });
});
