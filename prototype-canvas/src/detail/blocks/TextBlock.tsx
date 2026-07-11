import type { TextBlock as TextBlockT } from '../../schema';
import { useGraphStore } from '../../store/graphStore';

export function TextBlock({ nodeId, block }: { nodeId: string; block: TextBlockT }) {
  const updateBlock = useGraphStore((s) => s.updateBlock);
  return (
    <textarea
      value={block.html}
      placeholder="Write text…"
      onChange={(e) => updateBlock(nodeId, block.id, { html: e.target.value })}
      className="min-h-[72px] w-full resize-y rounded border border-stone-300 bg-transparent p-2 text-[13px] leading-relaxed focus:outline-none"
    />
  );
}
