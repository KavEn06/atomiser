import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
import { Field, controlStyle } from './details/Field';

// The type-aware half of an expanded node (atomiser.md §2). Structure lives
// here; freeform depth stays in the BlockList below it.
export function NodeDetails({ nodeId }: { nodeId: string }) {
  const node = useGraphStore((s) => s.nodes[nodeId]);
  const updateNode = useGraphStore((s) => s.updateNode);
  const th = THEMES[useSettings((s) => s.theme)];

  if (!node) return null;

  return (
    <div className="space-y-3">
      <Field label="Summary">
        <textarea
          aria-label="Summary"
          rows={2}
          value={node.description ?? ''}
          onChange={(e) => updateNode(nodeId, { description: e.target.value })}
          placeholder="One line on what this is"
          className="w-full resize-y rounded border p-2 text-[13px] leading-relaxed focus:outline-none"
          style={controlStyle(th)}
        />
      </Field>
    </div>
  );
}
