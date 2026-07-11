import type { NodeType, Status } from '../schema';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
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
  const th = THEMES[useSettings((s) => s.theme)];

  if (!id || !node) return null;

  const selectStyle = { borderColor: th.cardBorder, background: th.card, color: th.text };

  return (
    <aside
      className="absolute top-0 right-0 z-30 flex h-full w-[380px] flex-col border-l shadow-xl"
      style={{ background: th.app, color: th.text, borderColor: th.border }}
    >
      <header className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: th.border }}>
        <input
          value={node.title}
          onChange={(e) => updateNode(id, { title: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold focus:outline-none"
          style={{ color: th.text }}
        />
        <button aria-label="Close node" onClick={close} className="px-1" style={{ color: th.faint }}>
          ✕
        </button>
      </header>

      <div className="flex items-center gap-2 border-b px-4 py-2 text-[12px]" style={{ borderColor: th.border }}>
        <select
          value={node.nodeType}
          onChange={(e) => updateNode(id, { nodeType: e.target.value as NodeType })}
          className="rounded border px-1 py-0.5"
          style={selectStyle}
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
            className="rounded border px-1 py-0.5"
            style={selectStyle}
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
          className="ml-auto"
          style={{ color: th.status.blocked }}
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
