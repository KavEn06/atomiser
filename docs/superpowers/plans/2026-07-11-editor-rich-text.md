# Editor Rich Text (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-textarea text block with a Tiptap rich-text editor (bold/italic/underline, font size, font family, bullet list) and tidy the block "Insert" affordance — Plan B of the editor-enhancements spec.

**Architecture:** The text block's data changes from `markdown: string` to `html: string` (legacy `markdown` still read as initial content). `TextBlock.tsx` mounts a Tiptap (`@tiptap/react`) editor whose `onUpdate` writes `getHTML()` back through the existing `updateBlock` store action; a `RichTextToolbar` drives Tiptap commands. Because typing calls `updateBlock` per keystroke, the editor **pauses `zundo` history while focused** (consistent with Plan A pausing during node drags) — Tiptap's own history handles in-editor undo, and the Plan A focus-routed `⌘Z` already defers to the editor.

**Tech Stack:** React 19 · Tiptap 2 (`@tiptap/react` + StarterKit + Underline + TextStyle + FontFamily + a small custom FontSize extension) · Zustand/zundo (existing). Tests: Vitest 4 · Testing Library.

## Global Constraints

- **Runner is `bun`**; TypeScript strict — no `any`. Per-task commits.
- **The `graphStore` is the single write path**; text content persists as sanitized HTML via `updateBlock`.
- **Back-compat:** legacy text blocks store `markdown`; the editor initializes from `html ?? markdown ?? ''` and writes `html` thereafter. No data loss.
- **Content edits are not canvas-undoable** (documented, like node drag): the editor pauses `zundo` while focused; Tiptap owns in-editor undo.
- **Font family is a curated set** (Sans / Serif / Mono) — no arbitrary fonts. **Font size** is a curated set (Small / Normal / Large / XL).
- **Insert affordance keeps accessible names** `Add text` / `Add image` / `Add chart` (existing tests + a11y depend on them).
- Branch: `feat/editor-enhancements` (stacked on Plan A). Stays on Vite in `prototype-canvas/`.

---

## File Structure

**New:**
- `src/detail/blocks/fontSize.ts` — custom Tiptap `FontSize` mark extension (TextStyle-based).
- `src/detail/blocks/RichTextToolbar.tsx` — B/I/U, font-size select, font-family select, bullet list.

**Modified:**
- `src/schema.ts` — `TextBlock` gains `html`, keeps optional legacy `markdown`; `newTextBlock` returns `{ html: '' }`.
- `src/store/graphStore.blocks.test.ts` — update the text-block case from `markdown` to `html`.
- `src/detail/blocks/TextBlock.tsx` — rewrite to a Tiptap editor + toolbar + focus-pause.
- `src/detail/BlockList.tsx` — the three add buttons become an "Insert" row (same `addBlock`, same aria-labels).
- `src/test/setup.ts` — add jsdom stubs Tiptap/ProseMirror needs (`matchMedia`, `Range.getClientRects`).

---

## Task 1: Text block data model → html

**Files:**
- Modify: `src/schema.ts`, `src/store/graphStore.blocks.test.ts`

**Interfaces:**
- Produces: `TextBlock = { id; type: 'text'; html: string; markdown?: string }`; `newTextBlock()` → `{ id, type:'text', html:'' }`.

- [ ] **Step 1: Update the failing test** — in `src/store/graphStore.blocks.test.ts`, change the text-block case to use `html`:

Replace:
```ts
  it('updateBlock merges a patch while preserving the discriminant', () => {
    const n = s().addNode();
    const b = s().addBlock(n, 'text');
    s().updateBlock(n, b, { markdown: '# Notes' } as Partial<TextBlock>);
    expect((s().nodes[n].body[0] as TextBlock).markdown).toBe('# Notes');
  });
```
with:
```ts
  it('updateBlock merges a patch while preserving the discriminant', () => {
    const n = s().addNode();
    const b = s().addBlock(n, 'text');
    s().updateBlock(n, b, { html: '<p>Notes</p>' } as Partial<TextBlock>);
    expect((s().nodes[n].body[0] as TextBlock).html).toBe('<p>Notes</p>');
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/store/graphStore.blocks.test.ts`
Expected: FAIL — `html` does not exist on `TextBlock` (type error surfaces as a test failure / the property is undefined).

- [ ] **Step 3: Update `src/schema.ts`**

Change the `TextBlock` type:
```ts
export type TextBlock = { id: string; type: 'text'; html: string; markdown?: string };
```

Change `newTextBlock`:
```ts
export function newTextBlock(html = ''): TextBlock {
  return { id: `b_${nanoid(6)}`, type: 'text', html };
}
```

- [ ] **Step 4: Run the block tests to verify they pass**

Run: `bun run test src/store/graphStore.blocks.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck — surfaces the old `block.markdown` reference in `TextBlock.tsx`**

Run: `bun run typecheck`
Expected: ERROR in `src/detail/blocks/TextBlock.tsx` (`block.markdown` where the plain textarea reads/writes markdown). That file is fully rewritten in Task 2; to keep this task green, make the minimal edit so it compiles now:

In `src/detail/blocks/TextBlock.tsx`, change the textarea's `value` and `onChange` to use `html`:
```tsx
      value={block.html}
      placeholder="Write text…"
      onChange={(e) => updateBlock(nodeId, block.id, { html: e.target.value })}
```

- [ ] **Step 6: Typecheck again + full suite**

Run: `bun run typecheck && bun run test`
Expected: clean; all tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: text block stores html (legacy markdown read for back-compat)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Tiptap editor + formatting toolbar

**Files:**
- Create: `src/detail/blocks/fontSize.ts`, `src/detail/blocks/RichTextToolbar.tsx`, `src/detail/blocks/RichTextToolbar.test.tsx`
- Modify: `src/detail/blocks/TextBlock.tsx`, `src/test/setup.ts`

**Interfaces:**
- Consumes: `updateBlock`, `useGraphStore.temporal` (pause/resume), the block `html`.
- Produces: `FontSize` extension; `RichTextToolbar({ editor })` with buttons named `Bold`, `Italic`, `Underline`, a `Font size` select, a `Font family` select, and `Bullet list`; a `TextBlock` that renders a Tiptap editor wired to the store and pauses history while focused.

- [ ] **Step 1: Install Tiptap**

```bash
cd /Users/kavinnimalarajan/atomiser/prototype-canvas
bun add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-style @tiptap/extension-font-family
```

- [ ] **Step 2: Add jsdom stubs Tiptap needs — `src/test/setup.ts`**

Append:
```ts
// Tiptap/ProseMirror measurement in jsdom.
if (!globalThis.matchMedia) {
  // @ts-expect-error jsdom stub
  globalThis.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}
if (globalThis.Range && !Range.prototype.getClientRects) {
  // @ts-expect-error jsdom stub
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} });
  // @ts-expect-error jsdom stub
  Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 });
}
```

- [ ] **Step 3: Create the custom FontSize extension — `src/detail/blocks/fontSize.ts`**

```ts
import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

// A minimal font-size mark built on TextStyle (Tiptap has no core font-size).
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});
```

- [ ] **Step 4: Write the failing toolbar test — `src/detail/blocks/RichTextToolbar.test.tsx`**

The toolbar drives Tiptap commands; test it against a lightweight fake editor so it stays reliable (no ProseMirror in jsdom).

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RichTextToolbar } from './RichTextToolbar';

function fakeEditor() {
  const calls: string[] = [];
  const chain: Record<string, (...a: unknown[]) => unknown> = {};
  for (const m of ['focus', 'toggleBold', 'toggleItalic', 'toggleUnderline', 'toggleBulletList', 'setFontSize', 'setFontFamily']) {
    chain[m] = (...a: unknown[]) => {
      calls.push(a.length ? `${m}:${String(a[0])}` : m);
      return chain;
    };
  }
  chain.run = vi.fn();
  return {
    editor: { chain: () => chain, isActive: () => false } as unknown as Parameters<typeof RichTextToolbar>[0]['editor'],
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
    fireEvent.change(screen.getByLabelText('Font size'), { target: { value: '1.5rem' } });
    expect(calls).toContain('setFontSize:1.5rem');
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `bun run test src/detail/blocks/RichTextToolbar.test.tsx`
Expected: FAIL — `Cannot find module './RichTextToolbar'`.

- [ ] **Step 6: Create `src/detail/blocks/RichTextToolbar.tsx`**

```tsx
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
```

- [ ] **Step 7: Run the toolbar test to verify it passes**

Run: `bun run test src/detail/blocks/RichTextToolbar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Rewrite `src/detail/blocks/TextBlock.tsx`**

```tsx
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import type { TextBlock as TextBlockT } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { FontSize } from './fontSize';
import { RichTextToolbar } from './RichTextToolbar';

export function TextBlock({ nodeId, block }: { nodeId: string; block: TextBlockT }) {
  const updateBlock = useGraphStore((s) => s.updateBlock);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Underline, TextStyle, FontFamily, FontSize],
    content: block.html || block.markdown || '',
    onUpdate: ({ editor }) => updateBlock(nodeId, block.id, { html: editor.getHTML() }),
    // Text editing owns its own undo; pause graph history while focused so
    // per-keystroke updates don't fill the canvas undo stack.
    onFocus: () => useGraphStore.temporal.getState().pause(),
    onBlur: () => useGraphStore.temporal.getState().resume(),
  });

  if (!editor) return null;

  return (
    <div>
      <RichTextToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="min-h-[72px] rounded border border-stone-300 p-2 text-[13px] leading-relaxed [&_.ProseMirror]:outline-none [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
```

- [ ] **Step 9: Run the detail suite + typecheck**

Run: `bun run test src/detail && bun run typecheck`
Expected: `RichTextToolbar` + existing `BlockList`/`ChartBlock` tests pass; typecheck clean. (If a Tiptap render inside the `BlockList` test throws in jsdom, add the missing stub to `src/test/setup.ts` and re-run — do not weaken the assertion.)

- [ ] **Step 10: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: Tiptap rich-text editor + formatting toolbar in text blocks" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Insert row + end-to-end verification

**Files:**
- Modify: `src/detail/BlockList.tsx`

**Interfaces:**
- Consumes: `addBlock`. Produces: an "Insert" labelled row calling `addBlock(nodeId, kind)`, buttons keep aria-labels `Add text` / `Add image` / `Add chart`.

- [ ] **Step 1: Update `src/detail/BlockList.tsx`** — replace the bare add-buttons block with an Insert row (keep the same handlers + accessible names so `BlockList.test.tsx` still passes):

```tsx
      <div className="flex items-center gap-2 border-t border-stone-200 pt-2 text-[12px]">
        <span className="text-[10px] tracking-wider text-stone-400 uppercase">Insert</span>
        <button aria-label="Add text" onClick={() => addBlock(nodeId, 'text')} className="rounded border border-stone-300 px-2 py-1">
          ¶ Text
        </button>
        <button aria-label="Add image" onClick={() => addBlock(nodeId, 'image')} className="rounded border border-stone-300 px-2 py-1">
          ⧉ Image
        </button>
        <button aria-label="Add chart" onClick={() => addBlock(nodeId, 'chart')} className="rounded border border-stone-300 px-2 py-1">
          ▦ Chart
        </button>
      </div>
```

- [ ] **Step 2: Run the detail suite**

Run: `bun run test src/detail`
Expected: PASS (BlockList still finds `Add text` / `Add chart` by accessible name).

- [ ] **Step 3: Full suite + typecheck + build**

Run: `bun run test && bun run typecheck && bun run build`
Expected: all pass; build succeeds.

- [ ] **Step 4: End-to-end browser verification**

Restart the dev server and drive it (`B="$HOME/.claude/skills/gstack/browse/dist/browse"`):

```bash
lsof -ti:5173 | xargs kill 2>/dev/null; sleep 1
cd /Users/kavinnimalarajan/atomiser/prototype-canvas && (nohup bun run dev >/tmp/vite-b.log 2>&1 &) ; sleep 3
$B goto "http://localhost:5173/"
$B console --errors
```

Then, opening a node's drawer and its text block:
1. The **Insert** row shows Text / Image / Chart.
2. Add a text block → a Tiptap editor with the B / I / U / list / size / font toolbar appears.
3. Type text; toggle **bold**, **italic**, **underline**; pick a **font size** and a **font family** — the styling applies live.
4. **Reload** → the formatted HTML persists (localStorage).
5. While typing in the editor, `⌘Z` undoes text (not the graph); on the canvas, `⌘Z` still undoes graph edits.
6. No app console errors (Vite HMR socket noise is fine).

Capture a screenshot of a formatted text block.

- [ ] **Step 5: Commit**

```bash
cd /Users/kavinnimalarajan/atomiser
git add -A -- prototype-canvas
git commit -m "feat: Insert row for blocks; finalize rich-text editor" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage (Plan B):** Tiptap rich text with B/I/U + font size + font family + bullet list (Task 2) ✓; text block `markdown → html` with legacy read (Task 1) ✓; Insert affordance (Task 3) ✓; content-not-canvas-undoable via focus-pause (Task 2, Global Constraints) ✓.
- **Type consistency:** `TextBlock` `{ html; markdown? }`, `newTextBlock() → { html }`, `RichTextToolbar({ editor })`, `FontSize`, and `updateBlock(..., { html })` are used identically across tasks.
- **Placeholder scan:** every code step is complete; the one conditional ("if a Tiptap render throws in jsdom, add the stub") names the concrete fix rather than deferring.
- **Watch-items:** (1) Tiptap major/React-19 compat — verify the installed versions render under React 19 (smoke early); (2) Tiptap-in-jsdom may need more stubs than listed — add to `setup.ts` as failures name them, never weaken assertions; (3) `immediatelyRender: false` is set to avoid the React flushSync warning under StrictMode.
```
