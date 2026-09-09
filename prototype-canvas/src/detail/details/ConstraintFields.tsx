import { HARDNESS, type ConstraintDetails, type GraphNode, type Hardness } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { useSettings } from '../../store/settingsStore';
import { THEMES } from '../../theme';
import { Field, optionStyle } from './Field';
import { mergeDetails } from './parse';

const HARDNESS_LABELS: Record<Hardness, string> = { hard: 'Must hold', soft: 'Prefer' };

// A constraint's rule is its title and summary; the only structured thing left
// is how binding it is — which can later drive lint severity and edge rendering.
export function ConstraintFields({
  node,
  details,
}: {
  node: GraphNode;
  details: ConstraintDetails;
}) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const th = THEMES[useSettings((s) => s.theme)];

  return (
    <Field label="Strength">
      <div className="flex gap-1.5">
        {HARDNESS.map((h) => (
          <button
            key={h}
            aria-label={HARDNESS_LABELS[h]}
            aria-pressed={details.hardness === h}
            onClick={() =>
              updateNode(node.id, { meta: mergeDetails(node.meta, 'constraint', { hardness: h }) })
            }
            className="cursor-pointer rounded border px-2.5 py-1 text-[12px]"
            style={optionStyle(th, details.hardness === h)}
          >
            {HARDNESS_LABELS[h]}
          </button>
        ))}
      </div>
    </Field>
  );
}
