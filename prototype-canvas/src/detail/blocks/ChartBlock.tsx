import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartBlock as ChartBlockT } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { useSettings } from '../../store/settingsStore';
import { THEMES } from '../../theme';

const KINDS: ChartBlockT['kind'][] = ['bar', 'line', 'pie'];
const COLORS = ['#4d7c0f', '#b45309', '#0369a1', '#be123c', '#7c3aed'];

export function ChartBlock({ nodeId, block }: { nodeId: string; block: ChartBlockT }) {
  const updateBlock = useGraphStore((s) => s.updateBlock);
  const th = THEMES[useSettings((s) => s.theme)];

  const setPoint = (i: number, patch: Partial<{ label: string; value: number }>) => {
    const series = block.series.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    updateBlock(nodeId, block.id, { series });
  };
  const addPoint = () =>
    updateBlock(nodeId, block.id, { series: [...block.series, { label: 'New', value: 0 }] });
  const removePoint = (i: number) =>
    updateBlock(nodeId, block.id, { series: block.series.filter((_, idx) => idx !== i) });

  const axis = { tick: { fill: th.subtext, fontSize: 11 }, stroke: th.cardBorder };
  const inputStyle = { borderColor: th.cardBorder, color: th.text };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => updateBlock(nodeId, block.id, { kind: k })}
            className="rounded border px-2 py-0.5 text-[11px] capitalize"
            style={{
              borderColor: block.kind === k ? th.accent : th.cardBorder,
              color: block.kind === k ? th.text : th.subtext,
              fontWeight: block.kind === k ? 600 : 400,
            }}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {block.kind === 'bar' ? (
            <BarChart data={block.series}>
              <CartesianGrid strokeDasharray="3 3" stroke={th.cardBorder} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip contentStyle={{ background: th.card, border: `1px solid ${th.cardBorder}`, color: th.text }} />
              <Bar dataKey="value" fill={COLORS[0]} />
            </BarChart>
          ) : block.kind === 'line' ? (
            <LineChart data={block.series}>
              <CartesianGrid strokeDasharray="3 3" stroke={th.cardBorder} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip contentStyle={{ background: th.card, border: `1px solid ${th.cardBorder}`, color: th.text }} />
              <Line dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={{ background: th.card, border: `1px solid ${th.cardBorder}`, color: th.text }} />
              <Pie data={block.series} dataKey="value" nameKey="label" outerRadius={70} label>
                {block.series.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="space-y-1">
        {block.series.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <input
              value={p.label}
              onChange={(e) => setPoint(i, { label: e.target.value })}
              className="min-w-0 flex-1 rounded border bg-transparent px-1.5 py-0.5 focus:outline-none"
              style={inputStyle}
            />
            <input
              type="number"
              value={p.value}
              onChange={(e) => setPoint(i, { value: Number(e.target.value) })}
              className="w-20 rounded border bg-transparent px-1.5 py-0.5 focus:outline-none"
              style={inputStyle}
            />
            <button aria-label="Remove point" onClick={() => removePoint(i)} className="px-1" style={{ color: th.faint }}>
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addPoint}
          className="rounded border px-2 py-0.5 text-[11px]"
          style={{ borderColor: th.cardBorder, color: th.text }}
        >
          + row
        </button>
      </div>
    </div>
  );
}
