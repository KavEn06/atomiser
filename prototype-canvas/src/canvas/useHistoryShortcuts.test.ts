import { describe, expect, it } from 'vitest';
import { historyKeyAction } from './useHistoryShortcuts';

type E = Parameters<typeof historyKeyAction>[0];
const ev = (over: Partial<E>): E =>
  ({ key: 'z', metaKey: false, ctrlKey: false, shiftKey: false, target: null, ...over }) as E;

describe('historyKeyAction', () => {
  it('meta+z → undo, meta+shift+z → redo, ctrl+y → redo', () => {
    expect(historyKeyAction(ev({ key: 'z', metaKey: true }))).toBe('undo');
    expect(historyKeyAction(ev({ key: 'z', metaKey: true, shiftKey: true }))).toBe('redo');
    expect(historyKeyAction(ev({ key: 'y', ctrlKey: true }))).toBe('redo');
  });

  it('does nothing without a modifier or for other keys', () => {
    expect(historyKeyAction(ev({ key: 'z' }))).toBeNull();
    expect(historyKeyAction(ev({ key: 'a', metaKey: true }))).toBeNull();
  });

  it('defers to the field when focus is in an input/textarea/contenteditable', () => {
    expect(historyKeyAction(ev({ key: 'z', metaKey: true, target: { tagName: 'INPUT' } }))).toBeNull();
    expect(historyKeyAction(ev({ key: 'z', metaKey: true, target: { tagName: 'TEXTAREA' } }))).toBeNull();
    expect(
      historyKeyAction(ev({ key: 'z', metaKey: true, target: { tagName: 'DIV', isContentEditable: true } })),
    ).toBeNull();
  });
});
