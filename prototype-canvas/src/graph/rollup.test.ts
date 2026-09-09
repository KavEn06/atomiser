import { describe, expect, it } from 'vitest';
import { newNode, type GraphNode, type Status } from '../schema';
import { buildChildIndex, effectiveStatus, rollupOf, rollupStatuses } from './rollup';

const mk = (title: string, status: Status, parentId: string | null = null): GraphNode => ({
  ...newNode({ title, status }),
  parentId,
});

describe('rollupStatuses', () => {
  it('is done only when every child is done', () => {
    expect(rollupStatuses(['done', 'done'])).toBe('done');
    expect(rollupStatuses(['done', 'todo'])).not.toBe('done');
  });

  it('is blocked when any incomplete child is blocked', () => {
    expect(rollupStatuses(['done', 'blocked'])).toBe('blocked');
    expect(rollupStatuses(['todo', 'blocked', 'in_progress'])).toBe('blocked');
  });

  it('is in progress when something has started but nothing is blocked', () => {
    expect(rollupStatuses(['done', 'todo'])).toBe('in_progress');
    expect(rollupStatuses(['in_progress', 'todo'])).toBe('in_progress');
  });

  it('is todo when nothing has started', () => {
    expect(rollupStatuses(['todo', 'todo'])).toBe('todo');
  });
});

describe('effectiveStatus / rollupOf', () => {
  it('leaves keep their own status and report no rollup', () => {
    const leaf = mk('Leaf', 'blocked');
    const idx = buildChildIndex([leaf]);
    expect(effectiveStatus(leaf, idx)).toBe('blocked');
    expect(rollupOf(leaf, idx)).toBeNull();
  });

  it('a parent derives its status and progress from its children', () => {
    const p = mk('Firmware bring-up', 'todo');
    const kids = [
      mk('Toolchain', 'done', p.id),
      mk('Board config', 'blocked', p.id),
      mk('Blink test', 'todo', p.id),
    ];
    const idx = buildChildIndex([p, ...kids]);
    // The hand-set 'todo' on the parent is ignored — status is derived.
    expect(effectiveStatus(p, idx)).toBe('blocked');
    expect(rollupOf(p, idx)).toEqual({ status: 'blocked', done: 1, total: 3 });
  });

  it('rolls up through more than one level', () => {
    const top = mk('Top', 'todo');
    const mid = mk('Mid', 'todo', top.id);
    const kids = [mk('A', 'done', mid.id), mk('B', 'done', mid.id)];
    const idx = buildChildIndex([top, mid, ...kids]);
    // Both grandchildren are done → mid is done → top is done.
    expect(effectiveStatus(mid, idx)).toBe('done');
    expect(effectiveStatus(top, idx)).toBe('done');
    expect(rollupOf(top, idx)).toEqual({ status: 'done', done: 1, total: 1 });
  });

  it('counts a child as done using its derived status, not its stored one', () => {
    const top = mk('Top', 'todo');
    const mid = mk('Mid', 'todo', top.id); // stored todo, but its children are done
    const kids = [mk('A', 'done', mid.id), mk('B', 'done', mid.id)];
    const other = mk('Other', 'todo', top.id);
    const idx = buildChildIndex([top, mid, other, ...kids]);
    expect(rollupOf(top, idx)).toEqual({ status: 'in_progress', done: 1, total: 2 });
  });

  it('terminates if the hierarchy ever contains a cycle', () => {
    const a = mk('A', 'todo');
    const b = mk('B', 'todo', a.id);
    const looped: GraphNode = { ...a, parentId: b.id };
    const idx = buildChildIndex([looped, b]);
    expect(() => effectiveStatus(looped, idx)).not.toThrow();
  });
});
