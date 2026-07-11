import type { Editor } from '@tiptap/react';
import { useSettings } from '../../store/settingsStore';
import { THEMES } from '../../theme';

const SIZES: { label: string; value: string }[] = [
  { label: 'Small', value: '0.85rem' },
  { label: 'Normal', value: '1rem' },
  { label: 'Large', value: '1.35rem' },
  { label: 'XL', value: '1.75rem' },
];
const FAMILIES: { label: string; value: string }[] = [
  { label: 'Sans', value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Source Serif 4", serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
];

export function RichTextToolbar({ editor }: { editor: Editor }) {
  const th = THEMES[useSettings((s) => s.theme)];
  const selectStyle = { borderColor: th.cardBorder, background: th.card, color: th.text };
  const markStyle = (active: boolean) => ({
    background: active ? th.accent : 'transparent',
    color: active ? th.onAccent : th.subtext,
    fontWeight: active ? 600 : 400,
  });
  const cls = 'rounded px-1.5 py-0.5 text-[12px]';

  return (
    <div className="mb-1 flex flex-wrap items-center gap-1 border-b pb-1" style={{ borderColor: th.border }}>
      <button
        aria-label="Bold"
        className={cls}
        style={markStyle(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </button>
      <button
        aria-label="Italic"
        className={cls}
        style={markStyle(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </button>
      <button
        aria-label="Underline"
        className={cls}
        style={markStyle(editor.isActive('underline'))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <u>U</u>
      </button>
      <button
        aria-label="Bullet list"
        className={cls}
        style={markStyle(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </button>
      <select
        aria-label="Font size"
        defaultValue=""
        onChange={(e) => e.target.value && editor.chain().focus().setFontSize(e.target.value).run()}
        className="rounded border px-1 py-0.5 text-[12px]"
        style={selectStyle}
      >
        <option value="" disabled>
          Size
        </option>
        {SIZES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Font family"
        defaultValue=""
        onChange={(e) => e.target.value && editor.chain().focus().setFontFamily(e.target.value).run()}
        className="rounded border px-1 py-0.5 text-[12px]"
        style={selectStyle}
      >
        <option value="" disabled>
          Font
        </option>
        {FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}
