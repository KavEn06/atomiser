import type { Criterion, GraphNode, MilestoneDetails } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { useSettings } from '../../store/settingsStore';
import { THEMES } from '../../theme';
import { Field, controlStyle } from './Field';
import { mergeDetails, newCriterion } from './parse';

export function MilestoneFields({ node, details }: { node: GraphNode; details: MilestoneDetails }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const th = THEMES[useSettings((s) => s.theme)];
  const save = (patch: Partial<Omit<MilestoneDetails, 'nodeType'>>) =>
    updateNode(node.id, { meta: mergeDetails(node.meta, 'milestone', patch) });
  const setCriterion = (id: string, patch: Partial<Criterion>) =>
    save({ criteria: details.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const total = details.criteria.length;
  const met = details.criteria.filter((c) => c.met).length;

  return (
    <>
      <Field label={total > 0 ? `Acceptance criteria — ${met}/${total}` : 'Acceptance criteria'}>
        <div className="space-y-1">
          {details.criteria.map((c, i) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                aria-label={`Criterion ${i + 1} met`}
                checked={c.met}
                onChange={(e) => setCriterion(c.id, { met: e.target.checked })}
              />
              <input
                aria-label={`Criterion ${i + 1}`}
                value={c.text}
                onChange={(e) => setCriterion(c.id, { text: e.target.value })}
                placeholder="It is done when…"
                className="min-w-0 flex-1 rounded border px-1.5 py-1 text-[12.5px] focus:outline-none"
                style={controlStyle(th)}
              />
              <button
                aria-label={`Remove criterion ${i + 1}`}
                onClick={() => save({ criteria: details.criteria.filter((x) => x.id !== c.id) })}
                className="cursor-pointer px-1 text-[11px]"
                style={{ color: th.faint }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => save({ criteria: [...details.criteria, newCriterion()] })}
            className="cursor-pointer rounded border px-2 py-1 text-[12px]"
            style={controlStyle(th)}
          >
            + Criterion
          </button>
        </div>
      </Field>
      <Field label="Target date">
        <input
          type="date"
          aria-label="Target date"
          value={details.targetDate}
          onChange={(e) => save({ targetDate: e.target.value })}
          className="rounded border px-1.5 py-1 text-[12.5px] focus:outline-none"
          style={controlStyle(th)}
        />
      </Field>
    </>
  );
}
