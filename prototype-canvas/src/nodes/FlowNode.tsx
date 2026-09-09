import { Handle, Position, type NodeProps } from '@xyflow/react';
import { STATUS_LABELS, TYPE_GLYPH } from './labels';
import type { FlowNodeData, RFNode } from '../store/graphStore';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { THEMES } from '../theme';
import { useSettings } from '../store/settingsStore';

export function FlowNode({ id, data, selected }: NodeProps<RFNode>) {
  const { node, rollup, collapsed } = data as FlowNodeData;
  const cycleStatus = useGraphStore((s) => s.cycleStatus);
  const toggleCollapse = useGraphStore((s) => s.toggleCollapse);
  const openNode = useUiStore((s) => s.openNode);
  const th = THEMES[useSettings((s) => s.theme)];
  // A parent's status is derived from its children and is never hand-set (§7).
  const status = rollup ? rollup.status : node.status;
  const c = th.status[status];
  const isConstraint = node.nodeType === 'constraint';
  const isMilestone = node.nodeType === 'milestone';

  return (
    <div
      className="w-[210px] rounded-md border px-3 py-2.5"
      style={{
        background: isMilestone ? th.text : th.card,
        borderColor: selected ? th.accent : th.cardBorder,
        boxShadow: th.cardShadow,
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[8.5px] tracking-[0.2em] uppercase"
        style={{ color: th.faint }}
      >
        <span>{TYPE_GLYPH[node.nodeType]}</span>
        <span>{rollup ? 'group' : node.nodeType}</span>
        {rollup && (
          <button
            aria-label={collapsed ? 'Expand group' : 'Collapse group'}
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(id);
            }}
            className="cursor-pointer rounded px-1 text-[11px] leading-none"
            style={{ color: th.subtext }}
            title={collapsed ? 'Expand group' : 'Collapse group'}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        )}
        <button
          aria-label="Expand node"
          onClick={(e) => {
            e.stopPropagation();
            openNode(id);
          }}
          className="ml-auto cursor-pointer rounded px-1 text-[11px] leading-none"
          style={{ color: th.subtext }}
          title="Open node"
        >
          ⤢
        </button>
      </div>
      <div
        className="mt-1 text-[13px] leading-snug font-medium"
        style={{ color: isMilestone ? th.app : th.text }}
      >
        {node.title}
      </div>
      {!isConstraint &&
        (rollup ? (
          // Derived — a summary of the work inside, not a button.
          <div
            className="mt-1.5 flex items-center gap-1.5 text-[9.5px] tracking-[0.14em] uppercase"
            style={{ color: isMilestone ? th.faint : c }}
            title="Rolled up from this group's contents"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: isMilestone ? th.faint : c }} />
            {STATUS_LABELS[rollup.status]}
            <span style={{ color: th.faint }}>
              · {rollup.done}/{rollup.total} done
            </span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              cycleStatus(id);
            }}
            title="Click to cycle status"
            className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[9.5px] tracking-[0.14em] uppercase"
            style={{ color: isMilestone ? th.faint : c }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: isMilestone ? th.faint : c }} />
            {STATUS_LABELS[node.status]}
          </button>
        ))}
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0" style={{ background: th.faint }} />
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0" style={{ background: th.faint }} />
    </div>
  );
}
