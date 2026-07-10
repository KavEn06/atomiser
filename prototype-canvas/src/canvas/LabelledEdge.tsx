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

export function LabelledEdge(props: EdgeProps<RFEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const connector = useSettings((s) => s.edges);
  const th = THEMES[useSettings((s) => s.theme)];
  const setEdgeLabel = useGraphStore((s) => s.setEdgeLabel);
  const label = props.data?.edge.label ?? '';
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
      <BaseEdge id={id} path={path} style={{ stroke: th.edge, strokeWidth: 1.4 }} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: labelX, top: labelY, pointerEvents: 'all' }}
        >
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
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
