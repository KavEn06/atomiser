// PROTOTYPE — Variant D "Hybrid": Variant B's chat-first manuscript structure as
// the base, with the contested aesthetics — theme, font, connector style — exposed
// as a live settings panel (⚙ in the transcript header), persisted to localStorage.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
  SYNC_EVENTS,
  TYPE_GLYPH,
} from '../data';
import type { PlanEdge, PlanNode, Status } from '../data';
import { PlanActions, usePlanFlow } from '../usePlanFlow';

/* ---------- settings model ---------- */

type ThemeKey = 'paper' | 'studio';
type FontKey = 'serif' | 'plex' | 'archivo';
type EdgeKey = 'curved' | 'angular' | 'straight';
type Settings = { theme: ThemeKey; font: FontKey; edges: EdgeKey };

type Theme = {
  label: string;
  app: string; // transcript pane bg
  canvas: string;
  panel: string; // settings panel / constraint bg
  border: string; // pane + panel borders
  card: string; // node + proposal card bg
  cardBorder: string;
  cardShadow: string;
  text: string;
  subtext: string;
  faint: string;
  status: Record<Status, string>;
  accent: string; // everything proposed
  onAccent: string;
  edge: string;
  edgeConstrain: string;
  grid: string;
  gridVariant: BackgroundVariant;
  gridGap: number;
};

const THEMES: Record<ThemeKey, Theme> = {
  paper: {
    label: 'Paper',
    app: '#faf7f2',
    canvas: '#fdfcf9',
    panel: '#f6f1e8',
    border: '#e7e0d5',
    card: '#ffffff',
    cardBorder: '#e2dccf',
    cardShadow: '2px 2px 0 rgba(28,25,23,0.05)',
    text: '#1c1917',
    subtext: '#78716c',
    faint: '#a8a29e',
    status: { todo: '#78716c', in_progress: '#b45309', done: '#4d7c0f', blocked: '#b91c1c' },
    accent: '#c2410c',
    onAccent: '#ffffff',
    edge: '#c7bda8',
    edgeConstrain: '#d0c5ae',
    grid: '#f1ebdf',
    gridVariant: BackgroundVariant.Lines,
    gridGap: 34,
  },
  studio: {
    label: 'Studio',
    app: '#14141a',
    canvas: '#101014',
    panel: '#16161c',
    border: '#27272a',
    card: '#1b1b22',
    cardBorder: '#3f3f46',
    cardShadow: 'none',
    text: '#f4f4f5',
    subtext: '#a1a1aa',
    faint: '#71717a',
    status: { todo: '#71717a', in_progress: '#38bdf8', done: '#34d399', blocked: '#fb7185' },
    accent: '#fbbf24',
    onAccent: '#18181b',
    edge: '#3f3f46',
    edgeConstrain: '#52525b',
    grid: '#26262e',
    gridVariant: BackgroundVariant.Dots,
    gridGap: 24,
  },
};

const FONTS: Record<
  FontKey,
  { label: string; display: string; body: string; caption: string; family: string; italicLabels: boolean }
> = {
  serif: {
    label: 'Editorial',
    display: 'font-fraunces',
    body: 'font-serif4',
    caption: 'font-fraunces',
    family: 'Source Serif 4',
    italicLabels: true,
  },
  plex: {
    label: 'IBM Plex',
    display: 'font-plex',
    body: 'font-plex',
    caption: 'font-plexmono',
    family: 'IBM Plex Mono',
    italicLabels: false,
  },
  archivo: {
    label: 'Archivo',
    display: 'font-archivo',
    body: 'font-archivo',
    caption: 'font-archivo',
    family: 'Archivo',
    italicLabels: false,
  },
};

const EDGES: Record<EdgeKey, { label: string; rfType: 'default' | 'smoothstep' | 'straight'; preview: string }> = {
  curved: { label: 'Curved', rfType: 'default', preview: 'M3 17 C13 17 18 5 28 5' },
  angular: { label: 'Angular', rfType: 'smoothstep', preview: 'M3 17 H13 Q15 17 15 15 V7 Q15 5 17 5 H28' },
  straight: { label: 'Straight', rfType: 'straight', preview: 'M3 17 L28 5' },
};

const LS_KEY = 'atomiser-proto-settings';
const DEFAULTS: Settings = { theme: 'paper', font: 'serif', edges: 'curved' };

function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? '') as Partial<Settings>;
    return {
      theme: raw.theme && raw.theme in THEMES ? raw.theme : DEFAULTS.theme,
      font: raw.font && raw.font in FONTS ? raw.font : DEFAULTS.font,
      edges: raw.edges && raw.edges in EDGES ? raw.edges : DEFAULTS.edges,
    };
  } catch {
    return DEFAULTS;
  }
}

const Look = createContext<{ th: Theme; font: (typeof FONTS)[FontKey] }>({
  th: THEMES.paper,
  font: FONTS.serif,
});

/* ---------- node ---------- */

function HybridNode({ id, data, selected }: NodeProps<PlanNode>) {
  const { cycleStatus, renameNode } = useContext(PlanActions);
  const { th, font } = useContext(Look);
  const c = th.status[data.status];
  const milestone = data.ntype === 'milestone';

  if (data.ntype === 'constraint') {
    return (
      <div
        className="w-[170px] rounded-sm border border-dashed px-3 py-2"
        style={{ background: th.panel, borderColor: selected ? th.subtext : th.cardBorder }}
      >
        <div className={`${font.caption} text-[9px] tracking-[0.22em] uppercase`} style={{ color: th.faint }}>
          {TYPE_GLYPH.constraint} rule
        </div>
        <div
          className={`mt-0.5 ${font.body} text-[12.5px] ${font.italicLabels ? 'italic' : ''}`}
          style={{ color: th.subtext }}
        >
          {data.title}
        </div>
        <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0" style={{ background: th.faint }} />
      </div>
    );
  }

  return (
    <div
      className={`w-[190px] rounded-sm border px-3 py-2 ${data.proposed && !selected ? 'border-dashed' : ''}`}
      style={{
        background: milestone ? th.text : data.proposed ? `${th.accent}10` : th.card,
        borderColor: selected ? th.accent : data.proposed ? th.accent : milestone ? th.text : th.cardBorder,
        boxShadow: th.cardShadow,
      }}
    >
      <div
        className={`flex items-center gap-1.5 ${font.caption} text-[8.5px] tracking-[0.22em] uppercase`}
        style={{ color: th.faint }}
      >
        <span>{TYPE_GLYPH[data.ntype]}</span>
        <span>{data.ntype}</span>
        {data.proposed && (
          <span
            className={`ml-auto ${font.body} text-[10px] normal-case ${font.italicLabels ? 'italic' : ''}`}
            style={{ color: th.accent }}
          >
            proposed
          </span>
        )}
      </div>
      <div
        className={`mt-1 ${font.body} text-[13px] leading-snug font-medium ${
          data.ntype === 'decision' ? 'italic' : ''
        }`}
        style={{ color: milestone ? th.app : th.text }}
        onDoubleClick={() => renameNode(id)}
      >
        {data.title}
      </div>
      {data.note && (
        <div className={`mt-1 ${font.body} text-[10.5px] italic`} style={{ color: th.faint }}>
          {data.note}
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          cycleStatus(id);
        }}
        className={`mt-1.5 flex cursor-pointer items-center gap-1.5 ${font.caption} text-[9.5px] tracking-[0.14em] uppercase`}
        style={{ color: milestone ? th.faint : c }}
        title="Click to cycle status"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: milestone ? th.faint : c }} />
        {STATUS_LABEL[data.status]}
      </button>
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0" style={{ background: th.faint }} />
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0" style={{ background: th.faint }} />
    </div>
  );
}

const nodeTypes = { plan: HybridNode };

/* ---------- settings panel ---------- */

function SettingsPanel({
  settings,
  update,
  onClose,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  const { th, font } = useContext(Look);
  const section = `${font.caption} text-[9px] tracking-[0.24em] uppercase`;
  const optionStyle = (active: boolean) => ({
    borderColor: active ? th.accent : th.cardBorder,
    background: active ? `${th.accent}14` : th.card,
    color: th.text,
  });

  return (
    <div
      className="absolute top-[52px] right-4 z-50 w-[344px] rounded-md border p-4 shadow-xl"
      style={{ background: th.panel, borderColor: th.border }}
    >
      <div className="flex items-center justify-between">
        <span className={section} style={{ color: th.subtext }}>
          Workspace settings
        </span>
        <button onClick={onClose} aria-label="Close settings" className="cursor-pointer text-[12px]" style={{ color: th.faint }}>
          ✕
        </button>
      </div>

      <div className={`mt-4 ${section}`} style={{ color: th.faint }}>
        Theme
      </div>
      <div className="mt-1.5 flex gap-2">
        {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
          const t = THEMES[k];
          return (
            <button
              key={k}
              onClick={() => update({ theme: k })}
              className="flex-1 cursor-pointer rounded-md border p-2 text-left"
              style={optionStyle(settings.theme === k)}
            >
              <span
                className="flex h-7 items-center justify-center gap-1.5 rounded-sm border"
                style={{ background: t.app, borderColor: t.cardBorder }}
              >
                {(['done', 'in_progress', 'blocked', 'todo'] as Status[]).map((s) => (
                  <span key={s} className="h-2 w-2 rounded-full" style={{ background: t.status[s] }} />
                ))}
              </span>
              <span className="mt-1.5 block text-[11px]">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className={`mt-4 ${section}`} style={{ color: th.faint }}>
        Font
      </div>
      <div className="mt-1.5 flex gap-2">
        {(Object.keys(FONTS) as FontKey[]).map((k) => (
          <button
            key={k}
            onClick={() => update({ font: k })}
            className="flex-1 cursor-pointer rounded-md border p-2 text-center"
            style={optionStyle(settings.font === k)}
          >
            <span className={`${FONTS[k].body} block text-[17px] leading-none`}>Ag</span>
            <span className="mt-1.5 block text-[11px]">{FONTS[k].label}</span>
          </button>
        ))}
      </div>

      <div className={`mt-4 ${section}`} style={{ color: th.faint }}>
        Connectors
      </div>
      <div className="mt-1.5 flex gap-2">
        {(Object.keys(EDGES) as EdgeKey[]).map((k) => {
          const active = settings.edges === k;
          const stroke = active ? th.accent : th.subtext;
          return (
            <button
              key={k}
              onClick={() => update({ edges: k })}
              className="flex-1 cursor-pointer rounded-md border p-2 text-center"
              style={optionStyle(active)}
            >
              <svg width="34" height="22" viewBox="0 0 34 22" className="mx-auto block">
                <defs>
                  <marker
                    id={`proto-arrow-${k}`}
                    viewBox="0 0 8 8"
                    refX="6.5"
                    refY="4"
                    markerWidth="5.5"
                    markerHeight="5.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M0 0 L8 4 L0 8 Z" fill={stroke} />
                  </marker>
                </defs>
                <path
                  d={EDGES[k].preview}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="1.6"
                  markerEnd={`url(#proto-arrow-${k})`}
                />
              </svg>
              <span className="mt-1 block text-[11px]">{EDGES[k].label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- workspace ---------- */

export default function VariantD() {
  const flow = usePlanFlow();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [panelOpen, setPanelOpen] = useState(false);
  const [thread, setThread] = useState<{ role: 'you' | 'agent'; text: string }[]>([
    { role: 'you', text: PITCH },
    { role: 'agent', text: AGENT_INTRO },
  ]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  }, [settings]);

  const th = THEMES[settings.theme];
  const font = FONTS[settings.font];
  const look = useMemo(() => ({ th, font }), [th, font]);
  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  const styledEdges = useMemo(
    () =>
      flow.edges.map((e): PlanEdge => {
        const proposed = e.data?.proposed;
        const constrains = e.data?.kind === 'constrains';
        const color = proposed ? th.accent : constrains ? th.edgeConstrain : th.edge;
        return {
          ...e,
          type: EDGES[settings.edges].rfType,
          animated: !!proposed,
          style: {
            stroke: color,
            strokeWidth: 1.4,
            strokeDasharray: proposed ? '5 4' : constrains ? '2 5' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
          labelStyle: {
            fill: proposed ? th.accent : th.faint,
            fontSize: 10,
            fontFamily: font.family,
            fontStyle: font.italicLabels ? 'italic' : undefined,
          },
          labelBgStyle: { fill: th.canvas },
        };
      }),
    [flow.edges, settings.edges, th, font],
  );

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setThread((old) => [...old, { role: 'you', text: t }]);
    setDraft('');
    setTimeout(() => setThread((old) => [...old, { role: 'agent', text: CANNED_REPLY }]), 500);
  };

  return (
    <Look.Provider value={look}>
      <div className={`flex h-full w-full ${font.body}`} style={{ background: th.app, color: th.text }}>
        {/* transcript */}
        <section className="relative flex w-[400px] shrink-0 flex-col border-r" style={{ borderColor: th.border }}>
          <header className="border-b px-6 pt-5 pb-4" style={{ borderColor: th.border }}>
            <div className="flex items-center">
              <div className={`${font.caption} text-[10px] tracking-[0.3em] uppercase`} style={{ color: th.faint }}>
                Atomiser · planner
              </div>
              <button
                onClick={() => setPanelOpen((o) => !o)}
                aria-label="Workspace settings"
                title="Workspace settings"
                className="ml-auto cursor-pointer rounded border px-1.5 py-0.5 text-[12px] leading-none"
                style={{
                  color: panelOpen ? th.accent : th.subtext,
                  borderColor: panelOpen ? th.accent : th.cardBorder,
                }}
              >
                ⚙
              </button>
            </div>
            <h1 className={`mt-1 ${font.display} text-[22px] leading-tight font-semibold`}>
              Smart hydroponics controller
            </h1>
            <div
              className={`mt-1 ${font.body} text-[12px] ${font.italicLabels ? 'italic' : ''}`}
              style={{ color: th.subtext }}
            >
              Draft 3 · plan and conversation in sync
            </div>
          </header>

          {panelOpen && <SettingsPanel settings={settings} update={update} onClose={() => setPanelOpen(false)} />}

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {thread.map((m, i) => (
              <div key={i}>
                <div className={`${font.caption} text-[9px] tracking-[0.26em] uppercase`} style={{ color: th.faint }}>
                  {m.role === 'you' ? 'You' : 'Atomiser'}
                </div>
                <p className="mt-1 text-[14px] leading-relaxed" style={{ color: th.text }}>
                  {m.text}
                </p>
              </div>
            ))}

            <div className="space-y-1 border-l-2 pl-3" style={{ borderColor: th.border }}>
              {SYNC_EVENTS.map((ev) => (
                <div
                  key={ev}
                  className={`text-[11px] leading-relaxed ${font.italicLabels ? 'italic' : ''}`}
                  style={{ color: th.faint }}
                >
                  {ev}
                </div>
              ))}
            </div>

            {SUGGESTIONS.map((s) => {
              const st = flow.sugState[s.id];
              if (st !== 'pending') {
                return (
                  <div key={s.id} className="text-[12.5px] italic" style={{ color: th.faint }}>
                    {st === 'accepted' ? '✓ woven in' : 'set aside'} — {s.title.toLowerCase()}
                  </div>
                );
              }
              return (
                <div
                  key={s.id}
                  className="rounded-sm border p-4"
                  style={{ background: th.card, borderColor: th.cardBorder, boxShadow: th.cardShadow }}
                >
                  <div className={`${font.display} text-[15px] font-semibold`} style={{ color: th.accent }}>
                    {s.title}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed" style={{ color: th.subtext }}>
                    {s.reason}
                  </p>
                  <div className="mt-2 space-y-1 border-l-2 pl-3" style={{ borderColor: `${th.accent}44` }}>
                    {s.ops.map((op) => (
                      <div key={op} className="text-[12px]" style={{ color: th.subtext }}>
                        <span style={{ color: th.accent }}>{op.slice(0, 1)}</span>
                        {op.slice(1)}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <button
                      onClick={() => flow.accept(s.id)}
                      className="cursor-pointer rounded-sm px-3 py-1 text-[12.5px]"
                      style={{ background: th.accent, color: th.onAccent }}
                    >
                      Weave in
                    </button>
                    <button
                      onClick={() => flow.reject(s.id)}
                      className="cursor-pointer text-[12.5px] underline underline-offset-2"
                      style={{ color: th.subtext }}
                    >
                      Set aside
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={send} className="border-t px-6 py-4" style={{ borderColor: th.border }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply to your planner…"
              className={`w-full border-b bg-transparent py-1 text-[14px] ${
                font.italicLabels ? 'italic' : ''
              } placeholder:opacity-50 focus:outline-none`}
              style={{ color: th.text, borderColor: th.cardBorder }}
            />
          </form>
        </section>

        {/* canvas */}
        <PlanActions.Provider value={{ cycleStatus: flow.cycleStatus, renameNode: flow.renameNode }}>
          <div className="min-w-0 flex-1" style={{ background: th.canvas }}>
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
              <Background variant={th.gridVariant} gap={th.gridGap} size={1} color={th.grid} />
            </ReactFlow>
          </div>
        </PlanActions.Provider>
      </div>
    </Look.Provider>
  );
}
