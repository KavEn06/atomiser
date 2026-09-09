import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../../store/graphStore';
import { readDetails } from './parse';
import { TaskFields } from './TaskFields';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});
const s = () => useGraphStore.getState();

// The component is presentational — readDetails supplies the prop, exactly as
// the NodeDetails switcher will.
function mount(id: string) {
  const node = s().nodes[id];
  return render(<TaskFields node={node} details={readDetails({ ...node, nodeType: 'task' })} />);
}

const task = (id: string) => readDetails({ ...s().nodes[id], nodeType: 'task' as const });

describe('TaskFields', () => {
  it('writes the done-condition into its own meta bucket', () => {
    const id = s().addNode();
    mount(id);
    fireEvent.change(screen.getByLabelText('Done when'), {
      target: { value: 'LED blinks over UART' },
    });
    expect(task(id).doneWhen).toBe('LED blinks over UART');
    expect(s().nodes[id].meta).toEqual({ details: { task: { doneWhen: 'LED blinks over UART' } } });
  });

  it('sets effort, and clears it when the same value is clicked again', () => {
    const id = s().addNode();
    const { rerender } = mount(id);
    fireEvent.click(screen.getByLabelText('Effort Medium'));
    expect(task(id).effort).toBe('M');

    const node = s().nodes[id];
    rerender(<TaskFields node={node} details={readDetails({ ...node, nodeType: 'task' })} />);
    fireEvent.click(screen.getByLabelText('Effort Medium'));
    expect(task(id).effort).toBeNull();
  });

  it('marks only the selected effort as pressed', () => {
    const id = s().addNode();
    s().updateNode(id, { meta: { details: { task: { effort: 'L' } } } });
    mount(id);
    expect(screen.getByLabelText('Effort Large')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Effort Small')).toHaveAttribute('aria-pressed', 'false');
  });
});
