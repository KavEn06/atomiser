import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../store/graphStore';
import { BlockList } from './BlockList';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
});

describe('BlockList', () => {
  it('adds a text block (Tiptap editor mounts)', () => {
    const id = useGraphStore.getState().addNode();
    render(<BlockList nodeId={id} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add text' }));
    expect(useGraphStore.getState().nodes[id].body[0]).toMatchObject({ type: 'text' });
    // The rich-text toolbar renders alongside the mounted editor.
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
  });

  it('adds and removes a chart block', () => {
    const id = useGraphStore.getState().addNode();
    render(<BlockList nodeId={id} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add chart' }));
    expect(useGraphStore.getState().nodes[id].body).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Delete block'));
    expect(useGraphStore.getState().nodes[id].body).toHaveLength(0);
  });
});
