import { EFFORTS, type Effort, type GraphNode, type TaskDetails } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { useSettings } from '../../store/settingsStore';
import { THEMES } from '../../theme';
import { Field, controlStyle, optionStyle } from './Field';
import { mergeDetails } from './parse';

const EFFORT_LABELS: Record<Effort, string> = { S: 'Small', M: 'Medium', L: 'Large' };

export function TaskFields({ node, details }: { node: GraphNode; details: TaskDetails }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const th = THEMES[useSettings((s) => s.theme)];
  const save = (patch: Partial<Omit<TaskDetails, 'nodeType'>>) =>
    updateNode(node.id, { meta: mergeDetails(node.meta, 'task', patch) });

  return (
    <>
      {/* atomiser.md §7's stopping rule made editable: a node is atomic when it
          is one work session with an unambiguous done-condition. */}
      <Field label="Done when">
        <textarea
          aria-label="Done when"
          rows={2}
          value={details.doneWhen}
          onChange={(e) => save({ doneWhen: e.target.value })}
          placeholder="How will you know this is finished?"
          className="w-full resize-y rounded border p-2 text-[13px] leading-relaxed focus:outline-none"
          style={controlStyle(th)}
        />
      </Field>
      <Field label="Effort">
        <div className="flex gap-1.5">
          {EFFORTS.map((e) => (
            <button
              key={e}
              aria-label={`Effort ${EFFORT_LABELS[e]}`}
              aria-pressed={details.effort === e}
              // Clicking the current value clears it — effort is optional and
              // there is otherwise no way back to "not estimated".
              onClick={() => save({ effort: details.effort === e ? null : e })}
              className="cursor-pointer rounded border px-2.5 py-1 text-[12px]"
              style={optionStyle(th, details.effort === e)}
            >
              {EFFORT_LABELS[e]}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}
