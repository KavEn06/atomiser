import { newEdge, newNode, type GraphEdge, type GraphNode, type Layout } from './schema';

type Seeded = { nodes: GraphNode[]; edges: GraphEdge[]; layouts: Layout[] };

// The hydroponics sample from atomiser.md §8, in the new shape. Bodies start empty.
export function seedGraph(): Seeded {
  const mk = (
    title: string,
    nodeType: GraphNode['nodeType'],
    status: GraphNode['status'],
    x: number,
    y: number,
  ) => {
    const n = newNode({ title, nodeType, status });
    return { n, l: { nodeId: n.id, x, y, collapsed: false } as Layout };
  };

  const budget = mk('Budget ≤ $120', 'constraint', 'todo', 0, 80);
  const req = mk('Define requirements', 'milestone', 'done', 0, 300);
  const mcu = mk('Choose MCU — ESP32 vs RP2040', 'decision', 'done', 280, 190);
  const parts = mk('Order components', 'task', 'todo', 560, -40);
  const sensors = mk('Sensor selection', 'task', 'done', 560, 120);
  const fw = mk('Firmware bring-up', 'task', 'blocked', 560, 300);
  const enc = mk('Enclosure design', 'task', 'in_progress', 560, 480);
  const pump = mk('Pump driver circuit', 'task', 'in_progress', 860, 40);
  const dash = mk('Web dashboard', 'task', 'todo', 860, 300);
  const int = mk('Integration test', 'milestone', 'todo', 1140, 260);
  const deploy = mk('Deploy to greenhouse', 'task', 'todo', 1420, 260);

  const all = [budget, req, mcu, parts, sensors, fw, enc, pump, dash, int, deploy];
  const id = (x: (typeof all)[number]) => x.n.id;

  const edges: GraphEdge[] = [
    newEdge(id(req), id(mcu)),
    newEdge(id(budget), id(mcu), { edgeType: 'constrains', label: 'constrains' }),
    newEdge(id(mcu), id(parts)),
    newEdge(id(mcu), id(sensors)),
    newEdge(id(mcu), id(fw)),
    newEdge(id(mcu), id(enc)),
    newEdge(id(parts), id(fw)),
    newEdge(id(sensors), id(pump)),
    newEdge(id(fw), id(dash)),
    newEdge(id(pump), id(int)),
    newEdge(id(dash), id(int)),
    newEdge(id(enc), id(int)),
    newEdge(id(int), id(deploy)),
  ];

  return { nodes: all.map((x) => x.n), edges, layouts: all.map((x) => x.l) };
}
