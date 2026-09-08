import { useStore } from 'zustand';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
import { ToolButton } from './Toolbar';

// Dedicated undo/redo control, parked in the bottom-left corner (opposite the
// zoom controls) rather than living in the node toolbar.
export function UndoRedo() {
  const th = THEMES[useSettings((s) => s.theme)];
  const canUndo = useStore(useGraphStore.temporal, (t) => t.pastStates.length > 0);
  const canRedo = useStore(useGraphStore.temporal, (t) => t.futureStates.length > 0);

  return (
    <div
      className="absolute bottom-3 left-3 z-20 flex gap-1 rounded-lg border p-1 shadow-md"
      style={{ background: th.panel, borderColor: th.border }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
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
    </div>
  );
}
