import { useCallback, useMemo } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type NodeChange,
} from '@xyflow/react';
import { FlowNode } from '../nodes/FlowNode';
import { LabelledEdge } from './LabelledEdge';
import { selectFlowEdges, selectFlowNodes, useGraphStore, type RFNode } from '../store/graphStore';
import { useSettings } from '../store/settingsStore';
import { THEMES } from '../theme';

const nodeTypes = { flow: FlowNode };
const edgeTypes = { labelled: LabelledEdge };

function Canvas() {
  // Subscribe to raw record slices (stable refs) and derive RF arrays with useMemo,
  // so we never hand React Flow a brand-new array on unrelated renders.
  const nodesRec = useGraphStore((s) => s.nodes);
  const layouts = useGraphStore((s) => s.layouts);
  const edgesRec = useGraphStore((s) => s.edges);
  const connector = useSettings((s) => s.edges);
  const moveNode = useGraphStore((s) => s.moveNode);
  const connect = useGraphStore((s) => s.connect);
  const addNode = useGraphStore((s) => s.addNode);
  const th = THEMES[useSettings((s) => s.theme)];
  const rf = useReactFlow();

  const nodes = useMemo(() => selectFlowNodes({ nodes: nodesRec, layouts }), [nodesRec, layouts]);
  const edges = useMemo(() => selectFlowEdges({ edges: edgesRec }, connector), [edgesRec, connector]);

  const onNodesChange = useCallback(
    (changes: NodeChange<RFNode>[]) => {
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) moveNode(ch.id, ch.position.x, ch.position.y);
      }
    },
    [moveNode],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target) connect(c.source, c.target);
    },
    [connect],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.react-flow__node, .react-flow__controls')) return;
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode({ x: pos.x, y: pos.y });
    },
    [rf, addNode],
  );

  return (
    <div className="h-full w-full" style={{ background: th.canvas }} onDoubleClick={onDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
      >
        <Background variant={th.gridVariant} gap={th.gridGap} size={1} color={th.grid} />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

export function Editor() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
