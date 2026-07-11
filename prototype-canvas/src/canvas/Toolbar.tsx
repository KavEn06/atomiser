import { useStore } from 'zustand';
import { useReactFlow } from '@xyflow/react';
import type { NodeType } from '../schema';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
import { TYPE_GLYPH } from '../nodes/labels';
import { computeLayout } from './autoLayout';

const TYPES: NodeType[] = ['task', 'decision', 'milestone', 'constraint'];

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

  const btn = 'flex h-9 w-9 items-center justify-center rounded text-[15px] disabled:cursor-default';

  return (
    <div
      className="absolute top-3 left-3 z-20 flex flex-col gap-1 rounded-lg border p-1 shadow-md"
      style={{ background: th.panel, borderColor: th.border }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {TYPES.map((t) => (
        <button
          key={t}
          aria-label={`Add ${t}`}
          title={`Add ${t}`}
          onClick={() => create(t)}
          className={btn}
          style={{ color: th.text }}
        >
          {TYPE_GLYPH[t]}
        </button>
      ))}
      <div className="my-0.5 h-px" style={{ background: th.border }} />
      <button
        aria-label="Undo"
        title="Undo (⌘Z)"
        disabled={!canUndo}
        onClick={() => useGraphStore.temporal.getState().undo()}
        className={btn}
        style={{ color: canUndo ? th.text : th.faint }}
      >
        ↶
      </button>
      <button
        aria-label="Redo"
        title="Redo (⇧⌘Z)"
        disabled={!canRedo}
        onClick={() => useGraphStore.temporal.getState().redo()}
        className={btn}
        style={{ color: canRedo ? th.text : th.faint }}
      >
        ↷
      </button>
      <button
        aria-label="Auto-arrange"
        title="Auto-arrange"
        onClick={autoArrange}
        className={btn}
        style={{ color: th.text }}
      >
        ▦
      </button>
      <button
        aria-label="Fit view"
        title="Fit view"
        onClick={() => rf.fitView({ duration: 300, padding: 0.2 })}
        className={btn}
        style={{ color: th.text }}
      >
        ⤢
      </button>
    </div>
  );
}
