// PROTOTYPE — shared graph state + stub mutations. Layout/styling live in the variants.
import { createContext, useCallback, useState } from 'react';
import { addEdge, useEdgesState, useNodesState } from '@xyflow/react';
import type { Connection } from '@xyflow/react';
import { SUGGESTIONS, initialEdges, initialNodes } from './data';
import type { PlanEdge, PlanNode, Status } from './data';

const STATUS_CYCLE: Status[] = ['todo', 'in_progress', 'done', 'blocked'];

export type SugState = 'pending' | 'accepted' | 'rejected';

export const PlanActions = createContext<{
  cycleStatus: (id: string) => void;
  renameNode: (id: string) => void;
}>({ cycleStatus: () => {}, renameNode: () => {} });

export function usePlanFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<PlanNode>(initialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<PlanEdge>(initialEdges());
  const [sugState, setSugState] = useState<Record<string, SugState>>(() =>
    Object.fromEntries(SUGGESTIONS.map((s) => [s.id, 'pending'])),
  );

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge(c, eds)),
    [setEdges],
  );

  const accept = useCallback(
    (id: string) => {
      setSugState((s) => ({ ...s, [id]: 'accepted' }));
      setNodes((ns) =>
        ns.map((n) =>
          n.data.sug === id ? { ...n, data: { ...n.data, proposed: false, sug: undefined } } : n,
        ),
      );
      setEdges((es) =>
        es.map((e) =>
          e.data?.sug === id ? { ...e, data: { ...e.data, proposed: false, sug: undefined } } : e,
        ),
      );
    },
    [setNodes, setEdges],
  );

  const reject = useCallback(
    (id: string) => {
      setSugState((s) => ({ ...s, [id]: 'rejected' }));
      setNodes((ns) => ns.filter((n) => n.data.sug !== id));
      setEdges((es) => es.filter((e) => e.data?.sug !== id));
    },
    [setNodes, setEdges],
  );

  const setStatus = useCallback(
    (id: string, status: Status) => {
      setNodes((ns) =>
        ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n)),
      );
    },
    [setNodes],
  );

  const cycleStatus = useCallback(
    (id: string) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id && n.data.ntype !== 'constraint'
            ? {
                ...n,
                data: {
                  ...n.data,
                  status:
                    STATUS_CYCLE[(STATUS_CYCLE.indexOf(n.data.status) + 1) % STATUS_CYCLE.length],
                },
              }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const renameNode = useCallback(
    (id: string) => {
      const next = window.prompt('Rename node');
      if (next?.trim()) {
        setNodes((ns) =>
          ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, title: next.trim() } } : n)),
        );
      }
    },
    [setNodes],
  );

  return {
    nodes,
    edges,
    setNodes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    sugState,
    accept,
    reject,
    setStatus,
    cycleStatus,
    renameNode,
  };
}
