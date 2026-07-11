import type { Block } from '../schema';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
import { TextBlock } from './blocks/TextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { ChartBlock } from './blocks/ChartBlock';

function BlockView({ nodeId, block }: { nodeId: string; block: Block }) {
  if (block.type === 'text') return <TextBlock nodeId={nodeId} block={block} />;
  if (block.type === 'image') return <ImageBlock nodeId={nodeId} block={block} />;
  return <ChartBlock nodeId={nodeId} block={block} />;
}

export function BlockList({ nodeId }: { nodeId: string }) {
  const body = useGraphStore((s) => s.nodes[nodeId]?.body ?? []);
  const addBlock = useGraphStore((s) => s.addBlock);
  const deleteBlock = useGraphStore((s) => s.deleteBlock);
  const moveBlock = useGraphStore((s) => s.moveBlock);
  const th = THEMES[useSettings((s) => s.theme)];

  const insertStyle = { borderColor: th.cardBorder, color: th.text, background: th.card };

  return (
    <div className="space-y-3">
      {body.map((block) => (
        <div key={block.id} className="rounded border p-2" style={{ borderColor: th.cardBorder, background: th.card }}>
          <div
            className="mb-1 flex items-center gap-1 text-[10px] tracking-wider uppercase"
            style={{ color: th.faint }}
          >
            <span>{block.type}</span>
            <button aria-label="Move up" onClick={() => moveBlock(nodeId, block.id, -1)} className="ml-auto px-1">
              ↑
            </button>
            <button aria-label="Move down" onClick={() => moveBlock(nodeId, block.id, 1)} className="px-1">
              ↓
            </button>
            <button aria-label="Delete block" onClick={() => deleteBlock(nodeId, block.id)} className="px-1">
              ✕
            </button>
          </div>
          <BlockView nodeId={nodeId} block={block} />
        </div>
      ))}
      <div className="flex items-center gap-2 border-t pt-2 text-[12px]" style={{ borderColor: th.border }}>
        <span className="text-[10px] tracking-wider uppercase" style={{ color: th.faint }}>
          Insert
        </span>
        <button aria-label="Add text" onClick={() => addBlock(nodeId, 'text')} className="rounded border px-2 py-1" style={insertStyle}>
          ¶ Text
        </button>
        <button aria-label="Add image" onClick={() => addBlock(nodeId, 'image')} className="rounded border px-2 py-1" style={insertStyle}>
          ⧉ Image
        </button>
        <button aria-label="Add chart" onClick={() => addBlock(nodeId, 'chart')} className="rounded border px-2 py-1" style={insertStyle}>
          ▦ Chart
        </button>
      </div>
    </div>
  );
}
