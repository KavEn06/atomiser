import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RichTextToolbar } from './RichTextToolbar';

function fakeEditor() {
  const calls: string[] = [];
  const chain: Record<string, (...a: unknown[]) => unknown> = {};
  for (const m of [
    'focus',
    'toggleBold',
    'toggleItalic',
    'toggleUnderline',
    'toggleBulletList',
    'setFontSize',
    'setFontFamily',
  ]) {
    chain[m] = (...a: unknown[]) => {
      calls.push(a.length ? `${m}:${String(a[0])}` : m);
      return chain;
    };
  }
  chain.run = vi.fn();
  return {
    editor: { chain: () => chain, isActive: () => false } as unknown as Parameters<
      typeof RichTextToolbar
    >[0]['editor'],
    calls,
  };
}

describe('RichTextToolbar', () => {
  it('bold toggles bold via the editor chain', () => {
    const { editor, calls } = fakeEditor();
    render(<RichTextToolbar editor={editor} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(calls).toContain('toggleBold');
  });

  it('choosing a font size calls setFontSize', () => {
    const { editor, calls } = fakeEditor();
    render(<RichTextToolbar editor={editor} />);
    fireEvent.change(screen.getByLabelText('Font size'), { target: { value: '1.35rem' } });
    expect(calls).toContain('setFontSize:1.35rem');
  });
});
