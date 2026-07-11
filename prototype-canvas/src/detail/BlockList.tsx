import type { Block } from '../schema';
import { useGraphStore } from '../store/graphStore';
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

  return (
    <div className="space-y-3">
      {body.map((block) => (
        <div key={block.id} className="rounded border border-stone-200 p-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] tracking-wider text-stone-400 uppercase">
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
      <div className="flex gap-2">
        <button onClick={() => addBlock(nodeId, 'text')} className="rounded border border-stone-300 px-2 py-1 text-[12px]">
          Add text
        </button>
        <button onClick={() => addBlock(nodeId, 'image')} className="rounded border border-stone-300 px-2 py-1 text-[12px]">
          Add image
        </button>
        <button onClick={() => addBlock(nodeId, 'chart')} className="rounded border border-stone-300 px-2 py-1 text-[12px]">
          Add chart
        </button>
      </div>
    </div>
  );
}
