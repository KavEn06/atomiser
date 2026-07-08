// PROTOTYPE — Variant C "Mission Control": tracker-first. Status-saturated nodes,
// progress meter in the header, a quiet suggestion tray, and an "Up next" dock
// computed live from the real dependency graph.
import { useContext, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { STATUS_LABEL, SUGGESTIONS, TYPE_GLYPH } from '../data';
import type { PlanEdge, PlanNode, Status } from '../data';
import { PlanActions, usePlanFlow } from '../usePlanFlow';

const VIVID: Record<Status, string> = {
  todo: '#64748b',
  in_progress: '#2563eb',
  done: '#16a34a',
  blocked: '#dc2626',
};
const GHOST = '#d97706';

function ControlNode({ id, data, selected }: NodeProps<PlanNode>) {
  const { cycleStatus, renameNode } = useContext(PlanActions);
  const c = data.proposed ? GHOST : VIVID[data.status];

  if (data.ntype === 'constraint') {
    return (
      <div
        className={`w-[180px] rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-2 ${
          selected ? 'ring-2 ring-slate-400' : ''
        }`}
      >
        <div className="text-[8.5px] font-bold tracking-[0.2em] text-slate-400 uppercase">
          {TYPE_GLYPH.constraint} rule
        </div>
        <div className="mt-0.5 text-[12.5px] font-semibold text-slate-700">{data.title}</div>
        <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-slate-400" />
      </div>
    );
  }

  return (
    <div
      className={`relative w-[210px] rounded-lg border-2 px-3 py-2.5 ${
        data.proposed ? 'border-dashed' : ''
      } ${selected ? 'ring-2 ring-offset-1' : ''}`}
      style={{
        borderColor: c,
        background: data.proposed ? '#fffbeb' : `${c}12`,
        ...(data.status === 'blocked' && !data.proposed
          ? {
              backgroundImage:
                'repeating-linear-gradient(135deg, transparent 0 10px, rgba(220,38,38,0.06) 10px 20px)',
            }
          : {}),
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          cycleStatus(id);
        }}
        className="absolute -top-2.5 right-2 cursor-pointer rounded px-1.5 py-0.5 text-[8.5px] font-bold tracking-wider text-white uppercase"
        style={{ background: c }}
        title="Click to cycle status"
      >
        {data.proposed ? 'Proposed' : STATUS_LABEL[data.status]}
      </button>
      <div className="text-[8.5px] font-bold tracking-[0.2em] text-slate-400 uppercase">
        {TYPE_GLYPH[data.ntype]} {data.ntype}
      </div>
      <div
        className={`mt-1 text-[13px] leading-snug font-bold text-slate-900 ${
          data.status === 'done' ? 'opacity-70' : ''
        }`}
        onDoubleClick={() => renameNode(id)}
      >
        {data.status === 'done' ? '✓ ' : ''}
        {data.title}
      </div>
      {data.note && <div className="mt-1 text-[10px] leading-snug text-slate-500">{data.note}</div>}
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-slate-400" />
    </div>
  );
}

const nodeTypes = { plan: ControlNode };

function MissionControlInner() {
  const flow = usePlanFlow();
  const rf = useReactFlow();
  const [trayOpen, setTrayOpen] = useState(false);

  const real = useMemo(
    () => flow.nodes.filter((n) => !n.data.proposed && n.data.ntype !== 'constraint'),
    [flow.nodes],
  );
  const doneCount = real.filter((n) => n.data.status === 'done').length;

  const ready = useMemo(
    () =>
      real.filter(
        (n) =>
          n.data.status === 'todo' &&
          flow.edges
            .filter((e) => !e.data?.proposed && e.target === n.id)
            .every((e) => {
              const src = flow.nodes.find((m) => m.id === e.source);
              return !src || src.data.ntype === 'constraint' || src.data.status === 'done';
            }),
      ),
    [real, flow.edges, flow.nodes],
  );
  const inProgress = real.filter((n) => n.data.status === 'in_progress');
  const blocked = real.filter((n) => n.data.status === 'blocked');
  const pendingSugs = SUGGESTIONS.filter((s) => flow.sugState[s.id] === 'pending');

  const focusNode = (id: string) => {
    flow.setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })));
    rf.fitView({ nodes: [{ id }], duration: 500, maxZoom: 1.1, padding: 0.4 });
  };

  const styledEdges = useMemo(
    () =>
      flow.edges.map((e): PlanEdge => {
        const proposed = e.data?.proposed;
        const constrains = e.data?.kind === 'constrains';
        const color = proposed ? GHOST : constrains ? '#cbd5e1' : '#94a3b8';
        return {
          ...e,
          type: 'smoothstep',
          animated: !!proposed,
          style: {
            stroke: color,
            strokeWidth: 2,
            strokeDasharray: proposed ? '6 4' : constrains ? '2 6' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
          labelStyle: { fill: proposed ? GHOST : '#64748b', fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: '#f4f5f7' },
        };
      }),
    [flow.edges],
  );

  const dockCard = (
    n: PlanNode,
    badge: string,
    badgeColor: string,
    reason: string,
    action?: { label: string; run: () => void },
  ) => (
    <div
      key={n.id}
      onClick={() => focusNode(n.id)}
      className="w-[225px] shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-shadow hover:shadow-md"
      style={{ borderTop: `3px solid ${badgeColor}` }}
    >
      <div className="flex items-center justify-between">
        <span
          className="rounded px-1.5 py-0.5 text-[8.5px] font-bold tracking-wider text-white uppercase"
          style={{ background: badgeColor }}
        >
          {badge}
        </span>
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              action.run();
            }}
            className="rounded border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="mt-1.5 text-[12.5px] leading-snug font-bold text-slate-900">{n.data.title}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">{reason}</div>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col bg-[#f4f5f7] font-archivo text-slate-900">
      {/* header */}
      <header className="relative flex h-14 shrink-0 items-center gap-5 border-b border-slate-200 bg-white px-5">
        <span className="text-lg font-black tracking-tight">
          ATOMISER<span className="font-medium text-slate-400"> / hydroponics controller</span>
        </span>
        <div className="flex max-w-md flex-1 items-center gap-3">
          <div className="flex h-2.5 flex-1 gap-1">
            {[...real]
              .sort(
                (a, b) =>
                  ['done', 'in_progress', 'blocked', 'todo'].indexOf(a.data.status) -
                  ['done', 'in_progress', 'blocked', 'todo'].indexOf(b.data.status),
              )
              .map((n) => (
                <span
                  key={n.id}
                  className="flex-1 rounded-sm"
                  style={{ background: VIVID[n.data.status] }}
                  title={`${n.data.title} — ${STATUS_LABEL[n.data.status]}`}
                />
              ))}
          </div>
          <span className="text-sm font-bold whitespace-nowrap">
            {doneCount}/{real.length} done
          </span>
        </div>
        <button
          onClick={() => setTrayOpen((o) => !o)}
          className={`ml-auto rounded-full border px-3 py-1 text-[11px] font-bold ${
            pendingSugs.length > 0
              ? 'border-amber-300 bg-amber-100 text-amber-900'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          ⚑ {pendingSugs.length} suggestion{pendingSugs.length === 1 ? '' : 's'}
        </button>

        {trayOpen && (
          <div className="absolute top-[60px] right-4 z-40 w-[380px] rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
            {pendingSugs.length === 0 && (
              <div className="p-2 text-[12px] text-slate-500">
                No pending suggestions — the graph looks tight.
              </div>
            )}
            {pendingSugs.map((s) => (
              <div key={s.id} className="rounded-md p-2 hover:bg-slate-50">
                <div className="text-[12.5px] font-bold">{s.title}</div>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{s.reason}</p>
                <div className="mt-1.5 space-y-0.5 text-[10.5px] font-medium text-amber-700">
                  {s.ops.map((op) => (
                    <div key={op}>{op}</div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => flow.accept(s.id)}
                    className="rounded bg-slate-900 px-2.5 py-1 text-[10.5px] font-bold text-white hover:bg-slate-700"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => flow.reject(s.id)}
                    className="rounded border border-slate-200 px-2.5 py-1 text-[10.5px] font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* canvas */}
      <PlanActions.Provider value={{ cycleStatus: flow.cycleStatus, renameNode: flow.renameNode }}>
        <div className="min-h-0 flex-1">
          <ReactFlow
            nodes={flow.nodes}
            edges={styledEdges}
            onNodesChange={flow.onNodesChange}
            onEdgesChange={flow.onEdgesChange}
            onConnect={flow.onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.25}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#dde1e7" />
            <Controls position="top-left" />
          </ReactFlow>
        </div>
      </PlanActions.Provider>

      {/* up-next dock */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-5 pt-3 pb-4">
        <div className="text-[10px] font-bold tracking-[0.22em] text-slate-400 uppercase">
          Up next — from the dependency graph
        </div>
        <div className="mt-2 flex gap-3 overflow-x-auto pr-40 pb-1">
          {inProgress.map((n) =>
            dockCard(n, 'Continue', VIVID.in_progress, n.data.note ?? 'already started', {
              label: 'Mark done',
              run: () => flow.setStatus(n.id, 'done'),
            }),
          )}
          {ready.map((n) =>
            dockCard(n, 'Ready', VIVID.done, 'all upstream steps complete', {
              label: 'Start',
              run: () => flow.setStatus(n.id, 'in_progress'),
            }),
          )}
          {blocked.map((n) =>
            dockCard(n, 'Blocked', VIVID.blocked, n.data.note ?? 'marked blocked', {
              label: 'Unblock',
              run: () => flow.setStatus(n.id, 'todo'),
            }),
          )}
          {inProgress.length + ready.length + blocked.length === 0 && (
            <div className="py-4 text-[12px] text-slate-400">
              Nothing actionable — everything is either done or waiting on dependencies.
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function VariantC() {
  return (
    <ReactFlowProvider>
      <MissionControlInner />
    </ReactFlowProvider>
  );
}
