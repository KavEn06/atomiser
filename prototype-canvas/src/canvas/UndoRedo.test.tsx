import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../store/graphStore';
import { UndoRedo } from './UndoRedo';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});

describe('UndoRedo', () => {
  it('disables both controls when there is no history', () => {
    render(<UndoRedo />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('undoes and redoes the last edit', () => {
    render(<UndoRedo />);

    act(() => useGraphStore.getState().addNode({ x: 0, y: 0 }));
    expect(Object.keys(useGraphStore.getState().nodes)).toHaveLength(1);

    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toBeEnabled();
    fireEvent.click(undo);
    expect(Object.keys(useGraphStore.getState().nodes)).toHaveLength(0);

    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(redo).toBeEnabled();
    fireEvent.click(redo);
    expect(Object.keys(useGraphStore.getState().nodes)).toHaveLength(1);
  });
});
