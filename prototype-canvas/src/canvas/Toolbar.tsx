import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { useReactFlow } from '@xyflow/react';
import type { NodeType } from '../schema';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES, type Theme } from '../theme';
import { TYPE_GLYPH } from '../nodes/labels';
import { computeLayout } from './autoLayout';

const TYPES: NodeType[] = ['task', 'decision', 'milestone', 'constraint'];

// A toolbar button whose name appears in a tooltip after a brief hover, so the
// icon-only buttons are discoverable.
function ToolButton({
  label,
  hint,
  onClick,
  disabled,
  color,
  th,
  children,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
  th: Theme;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <button
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className="flex h-9 w-9 items-center justify-center rounded text-[15px] disabled:cursor-default"
        style={{ color }}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-1/2 left-full z-30 ml-2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[11px] opacity-0 shadow-md transition-opacity delay-300 duration-100 group-hover:opacity-100"
        style={{ background: th.text, color: th.app }}
      >
        {label}
        {hint && <span style={{ opacity: 0.55 }}>{hint}</span>}
      </span>
    </div>
  );
}

export function Toolbar() {
  const rf = useReactFlow();
  const addNode = useGraphStore((s) => s.addNode);
  const th = THEMES[useSettings((s) => s.theme)];
  const canUndo = useStore(useGraphStore.temporal, (t) => t.pastStates.length > 0);
  const canRedo = useStore(useGraphStore.temporal, (t) => t.futureStates.length > 0);

  const create = (nodeType: NodeType) => {
    const p = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    addNode({ nodeType, x: p.x, y: p.y });
  };

  const autoArrange = () => {
    const g = useGraphStore.getState();
    g.setLayouts(computeLayout(Object.values(g.nodes), Object.values(g.edges)));
    rf.fitView({ duration: 400, padding: 0.2 });
  };

  return (
    <div
      className="absolute top-3 left-3 z-20 flex flex-col gap-1 rounded-lg border p-1 shadow-md"
      style={{ background: th.panel, borderColor: th.border }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {TYPES.map((t) => (
        <ToolButton
          key={t}
          label={`Add ${t}`}
          onClick={() => create(t)}
          color={th.text}
          th={th}
        >
          {TYPE_GLYPH[t]}
        </ToolButton>
      ))}
      <div className="my-0.5 h-px" style={{ background: th.border }} />
      <ToolButton
        label="Undo"
        hint="⌘Z"
        disabled={!canUndo}
        onClick={() => useGraphStore.temporal.getState().undo()}
        color={canUndo ? th.text : th.faint}
        th={th}
      >
        ↶
      </ToolButton>
      <ToolButton
        label="Redo"
        hint="⇧⌘Z"
        disabled={!canRedo}
        onClick={() => useGraphStore.temporal.getState().redo()}
        color={canRedo ? th.text : th.faint}
        th={th}
      >
        ↷
      </ToolButton>
      <ToolButton label="Auto-arrange" onClick={autoArrange} color={th.text} th={th}>
        ▦
      </ToolButton>
      <ToolButton
        label="Fit view"
        onClick={() => rf.fitView({ duration: 300, padding: 0.2 })}
        color={th.text}
        th={th}
      >
        ⤢
      </ToolButton>
    </div>
  );
}
