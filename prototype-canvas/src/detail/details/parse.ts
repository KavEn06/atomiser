import { nanoid } from 'nanoid';
import { EFFORTS, HARDNESS } from '../../schema';
import type {
  Criterion,
  DecisionOption,
  DetailsByType,
  GraphNode,
  NodeDetails,
  NodeType,
} from '../../schema';

// `meta` is JSONB (atomiser.md §6): untyped, additive, and liable to hold
// whatever a past — or future — version of the app wrote there. Every read below
// *coerces* rather than validates, so a bad value degrades to the field's
// default and a read can never throw.

const rec = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  allowed.includes(v as T) ? (v as T) : null;

// Entries without a usable id are dropped rather than repaired: readDetails runs
// on every render, so minting an id here would churn state forever.
const withIds = <T>(v: unknown, map: (o: Record<string, unknown>, id: string) => T): T[] =>
  arr(v).flatMap((raw) => {
    const o = rec(raw);
    const id = str(o.id);
    return id ? [map(o, id)] : [];
  });

// <input type="date"> speaks YYYY-MM-DD or empty — anything else is noise.
const readDate = (v: unknown): string => (/^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? str(v) : '');

// Overloaded so a node with a known literal type narrows the result — callers
// holding a plain GraphNode still get the full union and switch on it.
export function readDetails<K extends NodeType>(node: {
  nodeType: K;
  meta: Record<string, unknown>;
}): DetailsByType[K];
export function readDetails(node: Pick<GraphNode, 'nodeType' | 'meta'>): NodeDetails {
  const d = rec(rec(rec(node.meta).details)[node.nodeType]);
  switch (node.nodeType) {
    case 'task':
      return { nodeType: 'task', doneWhen: str(d.doneWhen), effort: oneOf(d.effort, EFFORTS) };
    case 'decision': {
      const options = withIds(d.options, (o, id): DecisionOption => ({
        id,
        label: str(o.label),
        note: str(o.note),
      }));
      const chosenId = str(d.chosenId);
      return {
        nodeType: 'decision',
        options,
        // A choice pointing at a deleted option is no choice at all.
        chosenId: options.some((o) => o.id === chosenId) ? chosenId : null,
        rationale: str(d.rationale),
      };
    }
    case 'milestone':
      return {
        nodeType: 'milestone',
        criteria: withIds(d.criteria, (o, id): Criterion => ({
          id,
          text: str(o.text),
          met: o.met === true,
        })),
        targetDate: readDate(d.targetDate),
      };
    case 'constraint':
      return { nodeType: 'constraint', hardness: oneOf(d.hardness, HARDNESS) ?? 'hard' };
  }
}

// Details are bucketed by node type so switching a node's type never destroys
// the fields it had before — the old bucket sits untouched and comes straight
// back if the user switches back. Nothing outside `details` is disturbed: `meta`
// stays open for the domain-specific fields §6 reserves it for.
export function mergeDetails<K extends NodeType>(
  meta: Record<string, unknown>,
  nodeType: K,
  patch: Partial<Omit<DetailsByType[K], 'nodeType'>>,
): Record<string, unknown> {
  const details = rec(meta.details);
  return {
    ...meta,
    details: { ...details, [nodeType]: { ...rec(details[nodeType]), ...patch } },
  };
}

// Is there anything inside worth opening the node for? Drives the canvas marker
// — the drawer is currently the only place a node's content is visible at all,
// so the card gives no hint that any exists.
export function hasContent(
  node: Pick<GraphNode, 'nodeType' | 'meta' | 'body' | 'description'>,
): boolean {
  if (node.body.length > 0) return true;
  if ((node.description ?? '').trim() !== '') return true;
  const d = readDetails(node);
  switch (d.nodeType) {
    case 'task':
      return d.doneWhen.trim() !== '' || d.effort !== null;
    case 'decision':
      return d.options.length > 0 || d.rationale.trim() !== '';
    case 'milestone':
      return d.criteria.length > 0 || d.targetDate !== '';
    case 'constraint':
      // 'hard' is what a constraint is born as, so only an explicit 'soft'
      // counts as something the user actually put there.
      return d.hardness === 'soft';
  }
}

export const newOption = (): DecisionOption => ({ id: `o_${nanoid(6)}`, label: '', note: '' });
export const newCriterion = (): Criterion => ({ id: `c_${nanoid(6)}`, text: '', met: false });
