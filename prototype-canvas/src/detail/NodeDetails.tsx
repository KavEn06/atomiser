import type { GraphNode, NodeDetails as Details } from '../schema';
import { useGraphStore } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';
import { ConstraintFields } from './details/ConstraintFields';
import { DecisionFields } from './details/DecisionFields';
import { Field, controlStyle } from './details/Field';
import { MilestoneFields } from './details/MilestoneFields';
import { TaskFields } from './details/TaskFields';
import { readDetails } from './details/parse';

// A switch, not an if-chain: the never guard turns adding a fifth node type
// (atomiser.md §14 leaves the taxonomy open) into a compile error here rather
// than a silently missing section.
function Fields({ node, details }: { node: GraphNode; details: Details }) {
  switch (details.nodeType) {
    case 'task':
      return <TaskFields node={node} details={details} />;
    case 'decision':
      return <DecisionFields node={node} details={details} />;
    case 'milestone':
      return <MilestoneFields node={node} details={details} />;
    case 'constraint':
      return <ConstraintFields node={node} details={details} />;
    default: {
      const unhandled: never = details;
      return unhandled;
    }
  }
}

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
      <Fields node={node} details={readDetails(node)} />
    </div>
  );
}
