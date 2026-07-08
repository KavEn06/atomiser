// PROTOTYPE — mock plan data for the Atomiser canvas prototype (see NOTES.md).
// Sample project: the smart hydroponics controller from atomiser.md §8.
import type { Edge, Node } from '@xyflow/react';

export type NodeType = 'task' | 'decision' | 'milestone' | 'constraint';
export type Status = 'todo' | 'in_progress' | 'done' | 'blocked';

export type PlanNodeData = {
  title: string;
  ntype: NodeType;
  status: Status;
  note?: string;
  proposed?: boolean;
  sug?: string;
  [key: string]: unknown;
};

export type PlanEdgeData = {
  kind?: 'constrains';
  proposed?: boolean;
  sug?: string;
  [key: string]: unknown;
};

export type PlanNode = Node<PlanNodeData, 'plan'>;
export type PlanEdge = Edge<PlanEdgeData>;

export const STATUS_LABEL: Record<Status, string> = {
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

const N = (
  id: string,
  title: string,
  ntype: NodeType,
  status: Status,
  x: number,
  y: number,
  extra: Partial<PlanNodeData> = {},
): PlanNode => ({
  id,
  type: 'plan',
  position: { x, y },
  data: { title, ntype, status, ...extra },
});

const E = (
  id: string,
  source: string,
  target: string,
  data: PlanEdgeData = {},
  label?: string,
): PlanEdge => ({ id, source, target, data, label });

const BASE_NODES: PlanNode[] = [
  N('n_budget', 'Budget ≤ $120', 'constraint', 'todo', 0, 80),
  N('n_req', 'Define requirements', 'milestone', 'done', 0, 300),
  N('n_mcu', 'Choose MCU — ESP32 vs RP2040', 'decision', 'done', 280, 190, {
    note: 'ESP32-WROOM-32, ~$8',
  }),
  N('n_parts', 'Order components', 'task', 'todo', 560, -40),
  N('n_sensors', 'Sensor selection', 'task', 'done', 560, 120, {
    note: 'Capacitive soil moisture + DHT22',
  }),
  N('n_fw', 'Firmware bring-up', 'task', 'blocked', 560, 300, {
    note: 'waiting on component order',
  }),
  N('n_enclosure', 'Enclosure design', 'task', 'in_progress', 560, 480, {
    note: 'FDM print, v2 draft in CAD',
  }),
  N('n_pump', 'Pump driver circuit', 'task', 'in_progress', 860, 40, {
    note: 'MOSFET driver sketched, needs bench test',
  }),
  N('n_dash', 'Web dashboard', 'task', 'todo', 860, 300),
  N('n_int', 'Integration test', 'milestone', 'todo', 1140, 260),
  N('n_deploy', 'Deploy to greenhouse', 'task', 'todo', 1420, 260),
];

const BASE_EDGES: PlanEdge[] = [
  E('e_req_mcu', 'n_req', 'n_mcu'),
  E('e_budget_mcu', 'n_budget', 'n_mcu', { kind: 'constrains' }, 'constrains'),
  E('e_mcu_parts', 'n_mcu', 'n_parts'),
  E('e_mcu_sensors', 'n_mcu', 'n_sensors'),
  E('e_mcu_fw', 'n_mcu', 'n_fw'),
  E('e_mcu_enc', 'n_mcu', 'n_enclosure'),
  E('e_parts_fw', 'n_parts', 'n_fw'),
  E('e_sensors_pump', 'n_sensors', 'n_pump'),
  E('e_fw_dash', 'n_fw', 'n_dash'),
  E('e_pump_int', 'n_pump', 'n_int'),
  E('e_dash_int', 'n_dash', 'n_int'),
  E('e_enc_int', 'n_enclosure', 'n_int'),
  E('e_int_deploy', 'n_int', 'n_deploy'),
];

// ---------------------------------------------------------------------------
// Agent proposal — two pending suggestions, rendered as ghost nodes/edges on
// the canvas until accepted or rejected (the proposal-diff mechanic).
// ---------------------------------------------------------------------------

export interface Suggestion {
  id: string;
  title: string;
  reason: string;
  ops: string[];
}

export const SUGGESTIONS: Suggestion[] = [
  {
    id: 'sug_cal',
    title: 'Missing verification step',
    reason:
      'Sensor selection feeds the pump driver and integration directly — nothing checks that the sensors read true. A calibration pass catches drift before it poisons integration.',
    ops: [
      '+ node “Calibrate sensors” (task)',
      '+ edge Sensor selection → Calibrate sensors',
      '+ edge Calibrate sensors → Integration test',
    ],
  },
  {
    id: 'sug_loop',
    title: 'Close the loop',
    reason:
      'Test findings currently dead-end at deploy. A feedback edge from Integration test back to Enclosure design makes rework a first-class path instead of a surprise.',
    ops: ['+ edge Integration test → Enclosure design (“rework findings”)'],
  },
];

const GHOST_NODES: PlanNode[] = [
  N('n_cal', 'Calibrate sensors', 'task', 'todo', 880, 165, {
    proposed: true,
    sug: 'sug_cal',
  }),
];

const GHOST_EDGES: PlanEdge[] = [
  E('e_p_sensors_cal', 'n_sensors', 'n_cal', { proposed: true, sug: 'sug_cal' }),
  E('e_p_cal_int', 'n_cal', 'n_int', { proposed: true, sug: 'sug_cal' }),
  E('e_p_loop', 'n_int', 'n_enclosure', { proposed: true, sug: 'sug_loop' }, 'rework findings'),
];

// Fresh copies per variant mount, so switching variants resets local edits.
export const initialNodes = (): PlanNode[] => structuredClone([...BASE_NODES, ...GHOST_NODES]);
export const initialEdges = (): PlanEdge[] => structuredClone([...BASE_EDGES, ...GHOST_EDGES]);

// ---------------------------------------------------------------------------
// Canned transcript for the chat-flavoured variants.
// ---------------------------------------------------------------------------

export const PITCH =
  'I want a smart hydroponics controller — an ESP32 reads soil moisture and temperature, drives a pump, and I can watch it all on a little web dashboard. Budget is about $120.';

export const AGENT_INTRO =
  'Mapped it into 11 steps across hardware and software. Sensor work is furthest along; firmware bring-up is blocked on the component order. I have two structural suggestions — review them when you’re ready.';

export const SYNC_EVENTS = [
  'you set Firmware bring-up → blocked · noted, it gates Web dashboard',
  'you added edge Order components → Firmware bring-up',
];

export const CANNED_REPLY =
  'In the real product I’d turn that into a proposal diff on the canvas. This prototype’s agent is canned — imagine furiously intelligent graph edits here.';
