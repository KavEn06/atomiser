import type { DecisionDetails, DecisionOption, GraphNode } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { useSettings } from '../../store/settingsStore';
import { THEMES } from '../../theme';
import { Field, controlStyle } from './Field';
import { mergeDetails, newOption } from './parse';

export function DecisionFields({ node, details }: { node: GraphNode; details: DecisionDetails }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const th = THEMES[useSettings((s) => s.theme)];
  const save = (patch: Partial<Omit<DecisionDetails, 'nodeType'>>) =>
    updateNode(node.id, { meta: mergeDetails(node.meta, 'decision', patch) });
  const setOption = (id: string, patch: Partial<DecisionOption>) =>
    save({ options: details.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const chosen = details.options.find((o) => o.id === details.chosenId);

  return (
    <>
      <Field label="Options">
        <div className="space-y-1.5">
          {details.options.map((o, i) => (
            <div
              key={o.id}
              className="rounded border p-1.5"
              style={{ borderColor: th.cardBorder, background: th.card }}
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`chosen-${node.id}`}
                  aria-label={`Choose option ${i + 1}`}
                  checked={details.chosenId === o.id}
                  onChange={() => save({ chosenId: o.id })}
                />
                <input
                  aria-label={`Option ${i + 1}`}
                  value={o.label}
                  onChange={(e) => setOption(o.id, { label: e.target.value })}
                  placeholder="Option"
                  className="min-w-0 flex-1 bg-transparent text-[13px] focus:outline-none"
                  style={{ color: th.text }}
                />
                <button
                  aria-label={`Remove option ${i + 1}`}
                  // The stale chosenId is left in meta on purpose: readDetails
                  // drops a choice pointing at nothing, so a single undo brings
                  // back the option and the choice together.
                  onClick={() => save({ options: details.options.filter((x) => x.id !== o.id) })}
                  className="cursor-pointer px-1 text-[11px]"
                  style={{ color: th.faint }}
                >
                  ✕
                </button>
              </div>
              <input
                aria-label={`Note on option ${i + 1}`}
                value={o.note}
                onChange={(e) => setOption(o.id, { note: e.target.value })}
                placeholder="Trade-off"
                className="mt-1 w-full bg-transparent pl-5 text-[12px] focus:outline-none"
                style={{ color: th.subtext }}
              />
            </div>
          ))}
          <button
            onClick={() => save({ options: [...details.options, newOption()] })}
            className="cursor-pointer rounded border px-2 py-1 text-[12px]"
            style={controlStyle(th)}
          >
            + Option
          </button>
          <div className="text-[11px]" style={{ color: chosen ? th.status.done : th.faint }}>
            {chosen ? `Chosen — ${chosen.label || 'untitled option'}` : 'Undecided'}
          </div>
        </div>
      </Field>
      <Field label="Rationale">
        <textarea
          aria-label="Rationale"
          rows={2}
          value={details.rationale}
          onChange={(e) => save({ rationale: e.target.value })}
          placeholder="Why this one?"
          className="w-full resize-y rounded border p-2 text-[13px] leading-relaxed focus:outline-none"
          style={controlStyle(th)}
        />
      </Field>
    </>
  );
}
