import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import type { TextBlock as TextBlockT } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { useSettings } from '../../store/settingsStore';
import { THEMES } from '../../theme';
import { RichTextToolbar } from './RichTextToolbar';

export function TextBlock({ nodeId, block }: { nodeId: string; block: TextBlockT }) {
  const updateBlock = useGraphStore((s) => s.updateBlock);
  const th = THEMES[useSettings((s) => s.theme)];
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TextStyle, FontFamily, FontSize],
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
        className="min-h-[72px] rounded border p-2 text-[13px] leading-relaxed [&_.ProseMirror]:outline-none [&_ul]:list-disc [&_ul]:pl-5"
        style={{ borderColor: th.cardBorder, background: th.canvas, color: th.text }}
      />
    </div>
  );
}
