import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, useGraphStore } from '../../store/graphStore';
import { ConstraintFields } from './ConstraintFields';
import { readDetails } from './parse';

beforeEach(() => {
  localStorage.clear();
  useGraphStore.setState(createInitialState());
  useGraphStore.temporal.getState().clear();
});
const s = () => useGraphStore.getState();

function mount(id: string) {
  const node = s().nodes[id];
  return render(
    <ConstraintFields node={node} details={readDetails({ ...node, nodeType: 'constraint' })} />,
  );
}

const constraint = (id: string) =>
  readDetails({ ...s().nodes[id], nodeType: 'constraint' as const });

describe('ConstraintFields', () => {
  it('a fresh constraint is hard by default', () => {
    const id = s().addNode({ nodeType: 'constraint' });
    mount(id);
    expect(screen.getByLabelText('Must hold')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Prefer')).toHaveAttribute('aria-pressed', 'false');
  });

  it('softens the constraint when Prefer is clicked', () => {
    const id = s().addNode({ nodeType: 'constraint' });
    mount(id);
    fireEvent.click(screen.getByLabelText('Prefer'));
    expect(constraint(id).hardness).toBe('soft');
  });

  it('leaves unrelated meta keys alone', () => {
    const id = s().addNode({ nodeType: 'constraint' });
    s().updateNode(id, { meta: { vendor: 'acme' } });
    mount(id);
    fireEvent.click(screen.getByLabelText('Prefer'));
    expect(s().nodes[id].meta.vendor).toBe('acme');
    expect(constraint(id).hardness).toBe('soft');
  });
});
