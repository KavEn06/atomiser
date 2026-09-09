import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { NodeDetails } from './NodeDetails';
import { NodeDrawer } from './NodeDrawer';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});
const s = () => useGraphStore.getState();

describe('NodeDetails — summary', () => {
  it('writes the summary to description', () => {
    const id = s().addNode();
    render(<NodeDetails nodeId={id} />);
    fireEvent.change(screen.getByLabelText('Summary'), { target: { value: 'Both fit the budget' } });
    expect(s().nodes[id].description).toBe('Both fit the budget');
  });

  it('shows the summary for every node type, not just tasks', () => {
    const id = s().addNode({ nodeType: 'milestone' });
    render(<NodeDetails nodeId={id} />);
    expect(screen.getByLabelText('Summary')).toBeInTheDocument();
  });

  it('renders empty for a node persisted before description existed', () => {
    const id = s().addNode();
    // Nodes already in localStorage have no description key at all.
    expect(s().nodes[id].description).toBeUndefined();
    render(<NodeDetails nodeId={id} />);
    expect(screen.getByLabelText('Summary')).toHaveValue('');
  });

  it('an edit is undoable — the field goes through the graph history', () => {
    const id = s().addNode();
    render(<NodeDetails nodeId={id} />);
    fireEvent.change(screen.getByLabelText('Summary'), { target: { value: 'first' } });
    expect(s().nodes[id].description).toBe('first');
    useGraphStore.temporal.getState().undo();
    expect(s().nodes[id].description).toBeUndefined();
  });
});

describe('NodeDetails — type-aware fields', () => {
  const cases = [
    ['task', 'Done when', 'Rationale'],
    ['decision', 'Rationale', 'Done when'],
    ['milestone', 'Target date', 'Done when'],
  ] as const;

  it.each(cases)('a %s shows %s and not %s', (nodeType, shown, hidden) => {
    const id = s().addNode({ nodeType });
    render(<NodeDetails nodeId={id} />);
    expect(screen.getByLabelText(shown)).toBeInTheDocument();
    expect(screen.queryByLabelText(hidden)).not.toBeInTheDocument();
  });

  it('a constraint shows its strength control', () => {
    const id = s().addNode({ nodeType: 'constraint' });
    render(<NodeDetails nodeId={id} />);
    expect(screen.getByLabelText('Must hold')).toBeInTheDocument();
  });

  it('switching type hides the old fields but keeps them in meta', () => {
    const id = s().addNode({ nodeType: 'decision' });
    useUiStore.setState({ selectedNodeId: id });
    render(<NodeDrawer />);
    fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
    fireEvent.change(screen.getByLabelText('Option 1'), { target: { value: 'ESP32' } });

    fireEvent.change(screen.getByDisplayValue('decision'), { target: { value: 'task' } });
    expect(screen.queryByLabelText('Option 1')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Done when')).toBeInTheDocument();

    // The decision bucket was never touched, so switching back restores it.
    fireEvent.change(screen.getByDisplayValue('task'), { target: { value: 'decision' } });
    expect(screen.getByLabelText('Option 1')).toHaveValue('ESP32');
  });
});
