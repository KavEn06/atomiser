import type { Editor } from '@tiptap/react';

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
  const btn = (active: boolean) =>
    `rounded px-1.5 py-0.5 text-[12px] ${active ? 'bg-stone-200 font-semibold' : 'hover:bg-stone-100'}`;

  return (
    <div className="mb-1 flex flex-wrap items-center gap-1 border-b border-stone-200 pb-1">
      <button
        aria-label="Bold"
        className={btn(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </button>
      <button
        aria-label="Italic"
        className={btn(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </button>
      <button
        aria-label="Underline"
        className={btn(editor.isActive('underline'))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <u>U</u>
      </button>
      <button
        aria-label="Bullet list"
        className={btn(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </button>
      <select
        aria-label="Font size"
        defaultValue=""
        onChange={(e) => e.target.value && editor.chain().focus().setFontSize(e.target.value).run()}
        className="rounded border border-stone-300 bg-transparent px-1 py-0.5 text-[12px]"
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
        className="rounded border border-stone-300 bg-transparent px-1 py-0.5 text-[12px]"
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
