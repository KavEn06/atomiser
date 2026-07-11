import { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import type { RFEdge } from '../store/graphStore';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
import type { EdgeWeight } from '../schema';

const WEIGHTS: EdgeWeight[] = ['thin', 'normal', 'bold', 'heavy'];
const PREVIEW_H: Record<EdgeWeight, number> = { thin: 1, normal: 2, bold: 3, heavy: 4 };

export function LabelledEdge(props: EdgeProps<RFEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected } = props;
  const connector = useSettings((s) => s.edges);
  const th = THEMES[useSettings((s) => s.theme)];
  const setEdgeLabel = useGraphStore((s) => s.setEdgeLabel);
  const setEdgeWeight = useGraphStore((s) => s.setEdgeWeight);
  const label = props.data?.edge.label ?? '';
  const weight = props.data?.edge.weight ?? 'normal';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  const geo = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  const [path, labelX, labelY] =
    connector === 'curved'
      ? getBezierPath(geo)
      : connector === 'angular'
        ? getSmoothStepPath(geo)
        : getStraightPath(geo);

  const commit = () => {
    setEditing(false);
    setEdgeLabel(id, draft.trim());
  };

  return (
    <>
      <BaseEdge id={id} path={path} style={props.style} markerEnd={props.markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: labelX, top: labelY, pointerEvents: 'all' }}
        >
          <div className="flex flex-col items-center gap-1">
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                }}
                className="rounded border px-1 text-[10px]"
                style={{ background: th.card, borderColor: th.accent, color: th.text }}
              />
            ) : (
              <button
                onDoubleClick={() => {
                  setDraft(label);
                  setEditing(true);
                }}
                className="rounded px-1 text-[10px]"
                style={{ background: th.canvas, color: label ? th.subtext : th.faint }}
                title="Double-click to edit label"
              >
                {label || '+ label'}
              </button>
            )}

            {selected && (
              <div
                className="flex items-center gap-0.5 rounded border px-1 py-0.5"
                style={{ background: th.card, borderColor: th.cardBorder }}
              >
                {WEIGHTS.map((w) => (
                  <button
                    key={w}
                    aria-label={w}
                    title={w}
                    onClick={() => setEdgeWeight(id, w)}
                    className="flex h-4 w-4 items-center justify-center rounded"
                    style={{ color: weight === w ? th.accent : th.faint }}
                  >
                    <span
                      className="block w-3 rounded-full"
                      style={{ height: PREVIEW_H[w], background: 'currentColor' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
