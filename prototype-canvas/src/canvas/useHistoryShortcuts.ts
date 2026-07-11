import { useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';

type Keyish = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  target: { tagName?: string; isContentEditable?: boolean; closest?: (sel: string) => unknown } | null;
};

export function historyKeyAction(e: Keyish): 'undo' | 'redo' | null {
  if (!e.metaKey && !e.ctrlKey) return null;
  const k = e.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return null;

  const t = e.target;
  if (
    t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.isContentEditable === true ||
      (typeof t.closest === 'function' && t.closest('.ProseMirror')))
  ) {
    return null;
  }

  if (k === 'y' || (k === 'z' && e.shiftKey)) return 'redo';
  return 'undo';
}

export function useHistoryShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = historyKeyAction(e as unknown as Keyish);
      if (!action) return;
      e.preventDefault();
      const temporal = useGraphStore.temporal.getState();
      if (action === 'undo') temporal.undo();
      else temporal.redo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
