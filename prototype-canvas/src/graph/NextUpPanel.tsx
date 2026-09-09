import { useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';
import { FONTS, THEMES } from '../theme';
import { STATUS_LABELS, TYPE_GLYPH } from '../nodes/labels';
import { whatsNext } from './whatsNext';

// "What should I work on next?" — the ranked answer, read straight off the
// dependency graph. Lives beside the toolbar that opens it.
export function NextUpPanel() {
  const th = THEMES[useSettings((s) => s.theme)];
  const font = FONTS[useSettings((s) => s.font)];
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const open = useUiStore((s) => s.nextOpen);
  const closeNext = useUiStore((s) => s.closeNext);
  const openNode = useUiStore((s) => s.openNode);
  const rf = useReactFlow();

  const items = useMemo(
    () => whatsNext(Object.values(nodes), Object.values(edges)),
    [nodes, edges],
  );

  if (!open) return null;

  const section = `${font.caption} text-[9px] tracking-[0.24em] uppercase`;

  const focus = (id: string) => {
    openNode(id);
    rf.fitView({ nodes: [{ id }], maxZoom: 1.1, duration: 400 });
  };

  return (
    <div
      className="absolute top-3 left-16 z-20 w-[292px] rounded-lg border p-3 shadow-xl"
      style={{ background: th.panel, borderColor: th.border }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h2 className={section} style={{ color: th.subtext }}>
          Up next
        </h2>
        <button
          onClick={closeNext}
          aria-label="Close up next"
          className="cursor-pointer text-[12px]"
          style={{ color: th.faint }}
        >
          ✕
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: th.faint }}>
          Nothing is ready to start — everything is done, blocked, or waiting on
          something upstream.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {items.map(({ node, unblocks }) => (
            <li key={node.id}>
              <button
                onClick={() => focus(node.id)}
                aria-label={`${node.title} — ${STATUS_LABELS[node.status]}, unblocks ${unblocks}`}
                className="w-full cursor-pointer rounded-md border p-2 text-left"
                style={{ background: th.card, borderColor: th.cardBorder, color: th.text }}
              >
                <span className="flex items-baseline gap-1.5">
                  <span style={{ color: th.faint }}>{TYPE_GLYPH[node.nodeType]}</span>
                  <span className="text-[12.5px] leading-snug">{node.title}</span>
                </span>
                <span className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: th.status[node.status] }}
                  />
                  <span style={{ color: th.subtext }}>{STATUS_LABELS[node.status]}</span>
                  {unblocks > 0 && (
                    <span style={{ color: th.faint }}>· unblocks {unblocks}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
