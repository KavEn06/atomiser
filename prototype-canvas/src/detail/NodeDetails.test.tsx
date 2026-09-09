import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../store/graphStore';
import { NodeDetails } from './NodeDetails';

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
