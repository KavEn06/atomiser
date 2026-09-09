import { describe, expect, it } from 'vitest';
import { newNode, newTextBlock, type GraphNode, type NodeType } from '../../schema';
import { hasContent, mergeDetails, newCriterion, newOption, readDetails } from './parse';

// A node stub with whatever meta the case is probing. `meta` is untyped JSONB
// (atomiser.md §6), so the tests below deliberately feed it nonsense.
// Generic in K so the literal node type survives into readDetails and narrows
// its result; a plain GraphNode would widen it back to the whole union.
const node = <K extends NodeType>(nodeType: K, meta: unknown = {}) => ({
  ...newNode({ nodeType }),
  nodeType,
  meta: meta as Record<string, unknown>,
});

describe('readDetails — defaults', () => {
  it('returns each type at its defaults for empty meta', () => {
    expect(readDetails(node('task'))).toEqual({ nodeType: 'task', doneWhen: '', effort: null });
    expect(readDetails(node('decision'))).toEqual({
      nodeType: 'decision',
      options: [],
      chosenId: null,
      rationale: '',
    });
    expect(readDetails(node('milestone'))).toEqual({
      nodeType: 'milestone',
      criteria: [],
      targetDate: '',
    });
    expect(readDetails(node('constraint'))).toEqual({ nodeType: 'constraint', hardness: 'hard' });
  });

  it('never throws on garbage in any position', () => {
    const junk: unknown[] = [
      { details: 'nope' },
      { details: null },
      { details: 5 },
      { details: { task: 5 } },
      { details: { task: null } },
      { details: { task: { doneWhen: 42, effort: 'XL' } } },
      null,
      'not an object',
    ];
    for (const meta of junk) {
      expect(readDetails(node('task', meta))).toEqual({ nodeType: 'task', doneWhen: '', effort: null });
    }
  });
});

describe('mergeDetails', () => {
  it('writes the bucket for its own type only', () => {
    expect(mergeDetails({}, 'task', { doneWhen: 'x' })).toEqual({
      details: { task: { doneWhen: 'x' } },
    });
  });

  it('round trips through readDetails', () => {
    const meta = mergeDetails({}, 'task', { doneWhen: 'LED blinks' });
    expect(readDetails(node('task', meta)).doneWhen).toBe('LED blinks');
  });

  it('does not mutate the meta it is given', () => {
    const meta: Record<string, unknown> = {};
    mergeDetails(meta, 'task', { effort: 'M' });
    expect(meta).toEqual({});
  });

  it('leaves unrelated meta keys alone', () => {
    expect(mergeDetails({ vendor: 'acme' }, 'task', { effort: 'S' }).vendor).toBe('acme');
  });

  it('keeps both buckets when a node changes type', () => {
    let meta = mergeDetails({}, 'task', { doneWhen: 'LED blinks' });
    meta = mergeDetails(meta, 'decision', { rationale: 'cheaper' });
    expect(readDetails(node('task', meta)).doneWhen).toBe('LED blinks');
    const d = readDetails(node('decision', meta));
    expect(d.nodeType === 'decision' && d.rationale).toBe('cheaper');
  });
});

describe('readDetails — coercion', () => {
  it('drops list entries with no usable id and defaults wrong-typed values', () => {
    const meta = { details: { decision: { options: ['x', {}, { id: 'a', label: 5 }] } } };
    const d = readDetails(node('decision', meta));
    expect(d.nodeType === 'decision' && d.options).toEqual([{ id: 'a', label: '', note: '' }]);
  });

  it('coerces a non-boolean met to false', () => {
    const meta = { details: { milestone: { criteria: [{ id: 'c', met: 'yes' }] } } };
    const d = readDetails(node('milestone', meta));
    expect(d.nodeType === 'milestone' && d.criteria).toEqual([{ id: 'c', text: '', met: false }]);
  });

  it('forgets a choice that points at a deleted option', () => {
    const meta = { details: { decision: { options: [{ id: 'a' }], chosenId: 'b' } } };
    const d = readDetails(node('decision', meta));
    expect(d.nodeType === 'decision' && d.chosenId).toBeNull();
  });

  it('keeps a choice that still exists', () => {
    const meta = { details: { decision: { options: [{ id: 'a' }, { id: 'b' }], chosenId: 'b' } } };
    const d = readDetails(node('decision', meta));
    expect(d.nodeType === 'decision' && d.chosenId).toBe('b');
  });

  it('accepts only a full ISO date', () => {
    const date = (v: unknown) => {
      const d = readDetails(node('milestone', { details: { milestone: { targetDate: v } } }));
      return d.nodeType === 'milestone' ? d.targetDate : null;
    };
    expect(date('2026-09-30')).toBe('2026-09-30');
    expect(date('tomorrow')).toBe('');
    expect(date(12)).toBe('');
    expect(date('2026-9-3')).toBe('');
  });
});

describe('hasContent', () => {
  const withBody = (n: GraphNode, body: GraphNode['body']) => ({ ...n, body });

  it('is false for an untouched node', () => {
    expect(hasContent(node('task'))).toBe(false);
  });

  it('ignores a whitespace-only description', () => {
    expect(hasContent({ ...node('task'), description: '   ' })).toBe(false);
    expect(hasContent({ ...node('task'), description: 'x' })).toBe(true);
  });

  it('is true once a node holds a block', () => {
    expect(hasContent(withBody(node('task'), [newTextBlock()]))).toBe(true);
  });

  it('is true for any type-specific field', () => {
    expect(hasContent(node('task', mergeDetails({}, 'task', { doneWhen: 'x' })))).toBe(true);
    expect(hasContent(node('task', mergeDetails({}, 'task', { effort: 'S' })))).toBe(true);
    expect(hasContent(node('decision', mergeDetails({}, 'decision', { options: [newOption()] })))).toBe(
      true,
    );
    expect(
      hasContent(node('milestone', mergeDetails({}, 'milestone', { targetDate: '2026-09-30' }))),
    ).toBe(true);
  });

  it("counts a soft constraint but not the 'hard' it was born with", () => {
    expect(hasContent(node('constraint'))).toBe(false);
    expect(hasContent(node('constraint', mergeDetails({}, 'constraint', { hardness: 'hard' })))).toBe(
      false,
    );
    expect(hasContent(node('constraint', mergeDetails({}, 'constraint', { hardness: 'soft' })))).toBe(
      true,
    );
  });
});

describe('factories', () => {
  it('mint unique prefixed ids', () => {
    expect(newOption().id).toMatch(/^o_/);
    expect(newOption().id).not.toBe(newOption().id);
    expect(newCriterion().id).toMatch(/^c_/);
    expect(newCriterion().met).toBe(false);
  });
});
