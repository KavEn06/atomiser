// PROTOTYPE — Variant A "Studio": canvas-first dark editor, agent docked right.
// Proposal diffs live in the panel; pending ops render as amber ghosts on canvas.
import { useContext, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
} from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import {
  AGENT_INTRO,
  CANNED_REPLY,
  PITCH,
  STATUS_LABEL,
  SUGGESTIONS,
  SYNC_EVENTS,
  TYPE_GLYPH,
} from '../data';
import type { PlanEdge, PlanNode, Status } from '../data';
import { PlanActions, usePlanFlow } from '../usePlanFlow';

const STATUS_COLOR: Record<Status, string> = {
  todo: '#71717a',
  in_progress: '#38bdf8',
  done: '#34d399',
  blocked: '#fb7185',
};
const GHOST = '#fbbf24';

function StudioNode({ id, data, selected }: NodeProps<PlanNode>) {
  const { cycleStatus, renameNode } = useContext(PlanActions);
  const c = STATUS_COLOR[data.status];

  if (data.ntype === 'constraint') {
    return (
      <div
        className={`w-[180px] rounded-md border border-dashed px-3 py-2 font-plexmono ${
          selected ? 'border-amber-300' : 'border-zinc-600'
        } bg-[#16161c]`}
      >
        <div className="text-[9px] tracking-[0.2em] text-zinc-500 uppercase">
          {TYPE_GLYPH.constraint} constraint
        </div>
        <div className="mt-1 text-[12px] text-zinc-300">{data.title}</div>
        <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-zinc-600" />
      </div>
    );
  }

  return (
    <div
      className={`relative w-[212px] rounded-md border bg-[#1b1b22] ${
        selected
          ? 'border-amber-300'
          : data.proposed
            ? 'border-dashed border-amber-400/70'
            : 'border-zinc-700'
      }`}
      style={data.proposed ? { background: 'rgba(251,191,36,0.05)' } : undefined}
    >
      <span
        className="absolute top-0 left-0 h-full w-[3px] rounded-l-md"
        style={{ background: data.proposed ? GHOST : c }}
      />
      <div className="px-3 py-2.5 pl-4">
        <div className="flex items-center gap-1.5 font-plexmono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
          <span>{TYPE_GLYPH[data.ntype]}</span>
          <span>{data.ntype}</span>
          {data.proposed && (
            <span className="ml-auto text-amber-300">proposed</span>
          )}
        </div>
        <div
          className="mt-1 font-plex text-[13px] leading-snug font-medium text-zinc-100"
          onDoubleClick={() => renameNode(id)}
        >
          {data.title}
        </div>
        {data.note && <div className="mt-1 font-plex text-[11px] text-zinc-500 italic">{data.note}</div>}
        <button
          onClick={(e) => {
            e.stopPropagation();
            cycleStatus(id);
          }}
          className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 font-plexmono text-[9px] tracking-wider uppercase"
          style={{ borderColor: `${c}55`, color: c, background: `${c}14` }}
          title="Click to cycle status"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
          {STATUS_LABEL[data.status]}
        </button>
      </div>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-zinc-600" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-zinc-600" />
    </div>
  );
}

const nodeTypes = { plan: StudioNode };

export default function VariantA() {
  const flow = usePlanFlow();
  const [thread, setThread] = useState<{ role: 'you' | 'agent'; text: string }[]>([
    { role: 'you', text: PITCH },
    { role: 'agent', text: AGENT_INTRO },
  ]);
  const [draft, setDraft] = useState('');

  const styledEdges = useMemo(
    () =>
      flow.edges.map((e): PlanEdge => {
        const proposed = e.data?.proposed;
        const constrains = e.data?.kind === 'constrains';
        const color = proposed ? GHOST : constrains ? '#52525b' : '#3f3f46';
        return {
          ...e,
          type: 'smoothstep',
          animated: !!proposed,
          style: {
            stroke: color,
            strokeWidth: 1.5,
            strokeDasharray: proposed ? '6 4' : constrains ? '2 5' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 15, height: 15 },
          labelStyle: {
            fill: proposed ? GHOST : '#a1a1aa',
            fontSize: 10,
            fontFamily: 'IBM Plex Mono',
          },
          labelBgStyle: { fill: '#101014' },
        };
      }),
    [flow.edges],
  );

  const counts = useMemo(() => {
    const c: Record<Status, number> = { todo: 0, in_progress: 0, done: 0, blocked: 0 };
    for (const n of flow.nodes) {
      if (n.data.ntype !== 'constraint' && !n.data.proposed) c[n.data.status]++;
    }
    return c;
  }, [flow.nodes]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setThread((th) => [...th, { role: 'you', text: t }]);
    setDraft('');
    setTimeout(() => setThread((th) => [...th, { role: 'agent', text: CANNED_REPLY }]), 500);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#101014] font-plex text-zinc-200">
      {/* top bar */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-zinc-800 bg-[#16161c] px-4">
        <span className="font-plexmono text-[13px] font-semibold tracking-[0.22em] text-amber-300">
          ◆ ATOMISER
        </span>
        <span className="h-4 w-px bg-zinc-800" />
        <span className="text-[13px] text-zinc-300">Smart hydroponics controller</span>
        <div className="ml-auto flex items-center gap-3 font-plexmono text-[10px] tracking-wider uppercase">
          {(Object.keys(counts) as Status[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
              {counts[s]} {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
        <span className="h-4 w-px bg-zinc-800" />
        <button className="rounded border border-zinc-700 px-2.5 py-1 font-plexmono text-[10px] tracking-wider text-zinc-400 uppercase hover:border-zinc-500">
          Export ▾
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* canvas */}
        <PlanActions.Provider
          value={{ cycleStatus: flow.cycleStatus, renameNode: flow.renameNode }}
        >
          <div className="min-w-0 flex-1">
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
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#26262e" />
              <MiniMap
                pannable
                zoomable
                bgColor="#16161c"
                maskColor="rgba(16,16,20,0.78)"
                nodeColor={(n) => STATUS_COLOR[(n.data as PlanNode['data']).status] ?? '#3f3f46'}
                nodeStrokeWidth={0}
              />
            </ReactFlow>
          </div>
        </PlanActions.Provider>

        {/* agent dock */}
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-zinc-800 bg-[#14141a]">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
            <span className="font-plexmono text-[10px] tracking-[0.28em] text-zinc-400 uppercase">
              Agent
            </span>
            <span className="ml-auto flex items-center gap-1.5 font-plexmono text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              in sync
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {thread.map((m, i) => (
              <div key={i}>
                <div className="font-plexmono text-[9px] tracking-[0.24em] text-zinc-600 uppercase">
                  {m.role === 'you' ? 'You' : 'Atomiser'}
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-300">{m.text}</p>
              </div>
            ))}

            <div className="space-y-1 border-l-2 border-zinc-800 pl-3">
              {SYNC_EVENTS.map((ev) => (
                <div key={ev} className="font-plexmono text-[10px] leading-relaxed text-zinc-600">
                  ▸ {ev}
                </div>
              ))}
            </div>

            {SUGGESTIONS.map((s) => {
              const st = flow.sugState[s.id];
              if (st !== 'pending') {
                return (
                  <div key={s.id} className="font-plexmono text-[10px] text-zinc-600">
                    {st === 'accepted' ? '✓ applied' : '✗ dismissed'} — {s.title}
                  </div>
                );
              }
              return (
                <div
                  key={s.id}
                  className="rounded-md border border-amber-400/30 bg-amber-400/[0.04] p-3"
                >
                  <div className="font-plexmono text-[9px] tracking-[0.24em] text-amber-300 uppercase">
                    proposal
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-zinc-100">{s.title}</div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">{s.reason}</p>
                  <div className="mt-2 space-y-1 font-plexmono text-[10.5px] text-amber-200/90">
                    {s.ops.map((op) => (
                      <div key={op}>{op}</div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => flow.accept(s.id)}
                      className="rounded bg-amber-300 px-2.5 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-amber-200"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => flow.reject(s.id)}
                      className="rounded border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 hover:border-zinc-500"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={send} className="border-t border-zinc-800 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask or instruct…"
              className="w-full rounded-md border border-zinc-800 bg-[#101014] px-3 py-2 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:border-amber-300/50 focus:outline-none"
            />
          </form>
        </aside>
      </div>
    </div>
  );
}
