import type { NodeType, Status } from '../schema';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { BlockList } from './BlockList';
import { STATUS_LABELS } from '../nodes/labels';

const TYPES: NodeType[] = ['task', 'decision', 'milestone', 'constraint'];
const STATUSES: Status[] = ['todo', 'in_progress', 'done', 'blocked'];

export function NodeDrawer() {
  const id = useUiStore((s) => s.selectedNodeId);
  const close = useUiStore((s) => s.closeNode);
  const node = useGraphStore((s) => (id ? s.nodes[id] : undefined));
  const updateNode = useGraphStore((s) => s.updateNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);

  if (!id || !node) return null;

  return (
    <aside className="absolute top-0 right-0 z-30 flex h-full w-[380px] flex-col border-l border-stone-200 bg-white text-stone-900 shadow-xl">
      <header className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
        <input
          value={node.title}
          onChange={(e) => updateNode(id, { title: e.target.value })}
          className="min-w-0 flex-1 text-[15px] font-semibold focus:outline-none"
        />
        <button aria-label="Close node" onClick={close} className="px-1 text-stone-400">
          ✕
        </button>
      </header>

      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-2 text-[12px]">
        <select
          value={node.nodeType}
          onChange={(e) => updateNode(id, { nodeType: e.target.value as NodeType })}
          className="rounded border border-stone-300 px-1 py-0.5"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {node.nodeType !== 'constraint' && (
          <select
            value={node.status}
            onChange={(e) => updateNode(id, { status: e.target.value as Status })}
            className="rounded border border-stone-300 px-1 py-0.5"
          >
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => {
            deleteNode(id);
            close();
          }}
          className="ml-auto text-red-600"
        >
          Delete node
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <BlockList nodeId={id} />
      </div>
    </aside>
  );
}
