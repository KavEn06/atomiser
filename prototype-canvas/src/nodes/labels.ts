import type { NodeType, Status } from '../schema';

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
};

export const TYPE_GLYPH: Record<NodeType, string> = {
  task: '▢',
  decision: '◈',
  milestone: '⚑',
  constraint: '§',
};
