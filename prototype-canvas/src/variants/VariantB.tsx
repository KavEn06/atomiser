// PROTOTYPE — Variant B "Manuscript": chat-first editorial split. The conversation
// is the primary surface; the graph is its artifact. Proposals inline in the
// transcript ("weave in" / "set aside"), vermilion ink for anything proposed.
import { useContext, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
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
  TYPE_GLYPH,
} from '../data';
import type { PlanEdge, PlanNode, Status } from '../data';
import { PlanActions, usePlanFlow } from '../usePlanFlow';

const INK: Record<Status, string> = {
  todo: '#78716c',
  in_progress: '#b45309',
  done: '#4d7c0f',
  blocked: '#b91c1c',
};
const VERMILION = '#c2410c';

function ManuscriptNode({ id, data, selected }: NodeProps<PlanNode>) {
  const { cycleStatus, renameNode } = useContext(PlanActions);
  const c = INK[data.status];
  const milestone = data.ntype === 'milestone';

  if (data.ntype === 'constraint') {
    return (
      <div
        className={`w-[170px] rounded-sm border border-dashed px-3 py-2 ${
          selected ? 'border-stone-500' : 'border-stone-300'
        } bg-[#faf7f2]`}
      >
        <div className="font-fraunces text-[9px] tracking-[0.22em] text-stone-400 uppercase">
          rule
        </div>
        <div className="mt-0.5 font-serif4 text-[12.5px] text-stone-700 italic">{data.title}</div>
        <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-stone-400" />
      </div>
    );
  }

  return (
    <div
      className={`w-[190px] rounded-sm border px-3 py-2 shadow-[2px_2px_0_rgba(28,25,23,0.05)] ${
        milestone
          ? 'border-stone-900 bg-stone-900'
          : data.proposed
            ? 'border-dashed bg-[#fff6f0]'
            : 'border-[#e2dccf] bg-white'
      } ${selected ? 'ring-1 ring-stone-500' : ''}`}
      style={data.proposed ? { borderColor: VERMILION } : undefined}
    >
      <div
        className={`flex items-center gap-1.5 text-[8.5px] tracking-[0.22em] uppercase ${
          milestone ? 'text-stone-400' : 'text-stone-400'
        }`}
      >
        <span>{TYPE_GLYPH[data.ntype]}</span>
        <span>{data.ntype}</span>
        {data.proposed && (
          <span className="ml-auto font-serif4 text-[10px] normal-case italic" style={{ color: VERMILION }}>
            proposed
          </span>
        )}
      </div>
      <div
        className={`mt-1 font-serif4 text-[13px] leading-snug font-medium ${
          milestone ? 'text-stone-50' : 'text-stone-800'
        } ${data.ntype === 'decision' ? 'italic' : ''}`}
        onDoubleClick={() => renameNode(id)}
      >
        {data.title}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          cycleStatus(id);
        }}
        className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[9.5px] tracking-[0.14em] uppercase"
        style={{ color: milestone ? '#d6d3d1' : c }}
        title="Click to cycle status"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: milestone ? '#d6d3d1' : c }} />
        {STATUS_LABEL[data.status]}
      </button>
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-stone-400" />
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-stone-400" />
    </div>
  );
}

const nodeTypes = { plan: ManuscriptNode };

export default function VariantB() {
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
        const color = proposed ? VERMILION : constrains ? '#d0c5ae' : '#c7bda8';
        return {
          ...e,
          animated: !!proposed,
          style: {
            stroke: color,
            strokeWidth: 1.4,
            strokeDasharray: proposed ? '5 4' : constrains ? '2 5' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
          labelStyle: {
            fill: proposed ? VERMILION : '#a8a29e',
            fontSize: 10,
            fontFamily: 'Source Serif 4',
            fontStyle: 'italic',
          },
          labelBgStyle: { fill: '#fdfcf9' },
        };
      }),
    [flow.edges],
  );

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setThread((th) => [...th, { role: 'you', text: t }]);
    setDraft('');
    setTimeout(() => setThread((th) => [...th, { role: 'agent', text: CANNED_REPLY }]), 500);
  };

  return (
    <div className="flex h-full w-full bg-[#faf7f2] text-stone-900">
      {/* transcript */}
      <section className="flex w-[400px] shrink-0 flex-col border-r border-[#e7e0d5]">
        <header className="border-b border-[#e7e0d5] px-6 pt-5 pb-4">
          <div className="font-fraunces text-[10px] tracking-[0.3em] text-stone-400 uppercase">
            Atomiser · planner
          </div>
          <h1 className="mt-1 font-fraunces text-[22px] leading-tight font-semibold">
            Smart hydroponics controller
          </h1>
          <div className="mt-1 font-serif4 text-[12px] text-stone-500 italic">
            Draft 3 · plan and conversation in sync
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {thread.map((m, i) => (
            <div key={i}>
              <div className="text-[9px] tracking-[0.26em] text-stone-400 uppercase">
                {m.role === 'you' ? 'You' : 'Atomiser'}
              </div>
              <p className="mt-1 font-serif4 text-[14px] leading-relaxed text-stone-800">
                {m.text}
              </p>
            </div>
          ))}

          {SUGGESTIONS.map((s) => {
            const st = flow.sugState[s.id];
            if (st !== 'pending') {
              return (
                <div key={s.id} className="font-serif4 text-[12.5px] text-stone-500 italic">
                  {st === 'accepted' ? '✓ woven in' : 'set aside'} — {s.title.toLowerCase()}
                </div>
              );
            }
            return (
              <div
                key={s.id}
                className="rounded-sm border border-[#e7e0d5] bg-white p-4 shadow-[2px_2px_0_rgba(28,25,23,0.04)]"
              >
                <div
                  className="font-fraunces text-[15px] font-semibold"
                  style={{ color: VERMILION }}
                >
                  {s.title}
                </div>
                <p className="mt-1 font-serif4 text-[13px] leading-relaxed text-stone-700">
                  {s.reason}
                </p>
                <div className="mt-2 space-y-1 border-l-2 pl-3" style={{ borderColor: `${VERMILION}44` }}>
                  {s.ops.map((op) => (
                    <div key={op} className="font-serif4 text-[12px] text-stone-600">
                      <span style={{ color: VERMILION }}>{op.slice(0, 1)}</span>
                      {op.slice(1)}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <button
                    onClick={() => flow.accept(s.id)}
                    className="rounded-sm px-3 py-1 font-serif4 text-[12.5px] text-white"
                    style={{ background: VERMILION }}
                  >
                    Weave in
                  </button>
                  <button
                    onClick={() => flow.reject(s.id)}
                    className="font-serif4 text-[12.5px] text-stone-500 underline underline-offset-2 hover:text-stone-700"
                  >
                    Set aside
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={send} className="border-t border-[#e7e0d5] px-6 py-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply to your planner…"
            className="w-full border-b border-stone-300 bg-transparent py-1 font-serif4 text-[14px] italic placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
          />
        </form>
      </section>

      {/* canvas */}
      <PlanActions.Provider value={{ cycleStatus: flow.cycleStatus, renameNode: flow.renameNode }}>
        <div className="min-w-0 flex-1 bg-[#fdfcf9]">
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
            <Background variant={BackgroundVariant.Lines} gap={34} color="#f1ebdf" />
          </ReactFlow>
        </div>
      </PlanActions.Provider>
    </div>
  );
}
