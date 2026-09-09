import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../../store/graphStore';
import { DecisionFields } from './DecisionFields';
import { readDetails } from './parse';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});
const s = () => useGraphStore.getState();

const decision = (id: string) => readDetails({ ...s().nodes[id], nodeType: 'decision' as const });

// Re-reads the node from the store on every render so a click and its follow-up
// assertion see the same state the real drawer would.
function mount(id: string) {
  const view = render(<Fields id={id} />);
  return { ...view, refresh: () => view.rerender(<Fields id={id} />) };
}
function Fields({ id }: { id: string }) {
  const node = useGraphStore((st) => st.nodes[id]);
  return <DecisionFields node={node} details={readDetails({ ...node, nodeType: 'decision' })} />;
}

describe('DecisionFields', () => {
  it('adds options with unique ids', () => {
    const id = s().addNode({ nodeType: 'decision' });
    mount(id);
    fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
    const opts = decision(id).options;
    expect(opts).toHaveLength(2);
    expect(opts[0].id).toMatch(/^o_/);
    expect(opts[0].id).not.toBe(opts[1].id);
  });

  it('edits an option label and its trade-off note', () => {
    const id = s().addNode({ nodeType: 'decision' });
    mount(id);
    fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
    fireEvent.change(screen.getByLabelText('Option 1'), { target: { value: 'ESP32' } });
    fireEvent.change(screen.getByLabelText('Note on option 1'), {
      target: { value: 'Wi-Fi on board' },
    });
    expect(decision(id).options[0]).toMatchObject({ label: 'ESP32', note: 'Wi-Fi on board' });
  });

  it('records the chosen option and says so', () => {
    const id = s().addNode({ nodeType: 'decision' });
    mount(id);
    fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
    fireEvent.change(screen.getByLabelText('Option 2'), { target: { value: 'RP2040' } });
    fireEvent.click(screen.getByLabelText('Choose option 2'));
    expect(decision(id).chosenId).toBe(decision(id).options[1].id);
    expect(screen.getByText('Chosen — RP2040')).toBeInTheDocument();
  });

  it('shows Undecided until a choice is made', () => {
    const id = s().addNode({ nodeType: 'decision' });
    mount(id);
    expect(screen.getByText('Undecided')).toBeInTheDocument();
  });

  it('removing the chosen option leaves the decision undecided', () => {
    const id = s().addNode({ nodeType: 'decision' });
    mount(id);
    fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
    fireEvent.click(screen.getByLabelText('Choose option 2'));
    fireEvent.click(screen.getByLabelText('Remove option 2'));
    expect(decision(id).options).toHaveLength(1);
    // The stale id is still in meta; readDetails drops it on the way out.
    expect(decision(id).chosenId).toBeNull();
  });

  it('writes the rationale', () => {
    const id = s().addNode({ nodeType: 'decision' });
    mount(id);
    fireEvent.change(screen.getByLabelText('Rationale'), { target: { value: 'Needs Wi-Fi' } });
    expect(decision(id).rationale).toBe('Needs Wi-Fi');
  });
});
