import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../store/graphStore';
import { BlockList } from './BlockList';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
});

describe('BlockList', () => {
  it('adds a text block and edits its markdown', () => {
    const id = useGraphStore.getState().addNode();
    render(<BlockList nodeId={id} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add text' }));
    const area = screen.getByPlaceholderText('Write text…') as HTMLTextAreaElement;
    fireEvent.change(area, { target: { value: 'hello' } });
    expect(useGraphStore.getState().nodes[id].body[0]).toMatchObject({ type: 'text', html: 'hello' });
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
