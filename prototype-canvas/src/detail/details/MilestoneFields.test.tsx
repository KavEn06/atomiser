import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../../store/graphStore';
import { MilestoneFields } from './MilestoneFields';
import { readDetails } from './parse';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});
const s = () => useGraphStore.getState();

const milestone = (id: string) => readDetails({ ...s().nodes[id], nodeType: 'milestone' as const });

function Fields({ id }: { id: string }) {
  const node = useGraphStore((st) => st.nodes[id]);
  return <MilestoneFields node={node} details={readDetails({ ...node, nodeType: 'milestone' })} />;
}
const mount = (id: string) => render(<Fields id={id} />);

describe('MilestoneFields', () => {
  it('adds an unmet criterion', () => {
    const id = s().addNode({ nodeType: 'milestone' });
    mount(id);
    fireEvent.click(screen.getByRole('button', { name: '+ Criterion' }));
    expect(milestone(id).criteria).toHaveLength(1);
    expect(milestone(id).criteria[0].met).toBe(false);
  });

  it('edits and ticks a criterion', () => {
    const id = s().addNode({ nodeType: 'milestone' });
    mount(id);
    fireEvent.click(screen.getByRole('button', { name: '+ Criterion' }));
    fireEvent.change(screen.getByLabelText('Criterion 1'), { target: { value: 'Board powers on' } });
    fireEvent.click(screen.getByLabelText('Criterion 1 met'));
    expect(milestone(id).criteria[0]).toMatchObject({ text: 'Board powers on', met: true });
  });

  it('counts met criteria in the heading', () => {
    const id = s().addNode({ nodeType: 'milestone' });
    mount(id);
    fireEvent.click(screen.getByRole('button', { name: '+ Criterion' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Criterion' }));
    fireEvent.click(screen.getByLabelText('Criterion 1 met'));
    expect(screen.getByText('Acceptance criteria — 1/2')).toBeInTheDocument();
  });

  it('removes a criterion', () => {
    const id = s().addNode({ nodeType: 'milestone' });
    mount(id);
    fireEvent.click(screen.getByRole('button', { name: '+ Criterion' }));
    fireEvent.click(screen.getByLabelText('Remove criterion 1'));
    expect(milestone(id).criteria).toHaveLength(0);
  });

  it('accepts and clears a target date', () => {
    const id = s().addNode({ nodeType: 'milestone' });
    mount(id);
    fireEvent.change(screen.getByLabelText('Target date'), { target: { value: '2026-09-30' } });
    expect(milestone(id).targetDate).toBe('2026-09-30');
    fireEvent.change(screen.getByLabelText('Target date'), { target: { value: '' } });
    expect(milestone(id).targetDate).toBe('');
  });
});
