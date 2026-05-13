import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock,
  GitBranch,
  GripVertical,
  Image,
  MessageSquare,
  MousePointer2,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Sticker,
  Trash2,
  Webhook,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import VisualEditorApi, { FlexMessageSummary } from '@/features/visual-editor/api/visualEditorApi';
import {
  WORKFLOW_NODE_DEFINITIONS,
  createWorkflowEdge,
  createWorkflowNode,
  getWorkflowInputHandles,
  getWorkflowNodeDefinition,
  getWorkflowNodeKind,
  getWorkflowOutputHandles,
  removeWorkflowEdge,
  removeWorkflowNode,
  updateWorkflowNodeData,
  updateWorkflowNodePosition,
  upsertWorkflowEdge,
  validateWorkflowGraph,
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowNodeDefinition,
  type WorkflowNodeType,
} from '@/features/visual-editor/types/workflow';

const NODE_WIDTH = 236;
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1500;

interface WorkflowBuilderProps {
  graph: WorkflowGraph;
  onChange: (graph: WorkflowGraph) => void;
}

interface PendingConnection {
  nodeId: string;
  handleId: string;
}

interface ConnectionDrag extends PendingConnection {
  current: { x: number; y: number };
}

interface CanvasPan {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

interface SimMessage {
  type: 'user' | 'bot' | 'system';
  content: string;
}

const iconByType: Record<WorkflowNodeType, React.ComponentType<{ className?: string }>> = {
  'trigger.message': MessageSquare,
  'trigger.follow': Zap,
  'trigger.postback': MousePointer2,
  'trigger.image': Image,
  'condition.keyword': GitBranch,
  'action.replyText': MessageSquare,
  'action.replyImage': Image,
  'action.replySticker': Sticker,
  'action.replyFlex': Sparkles,
  'action.aiTakeover': Brain,
  'action.setVariable': Settings,
  'action.wait': Clock,
  'action.webhook': Webhook,
};

const groupedDefinitions = WORKFLOW_NODE_DEFINITIONS.reduce<Record<string, WorkflowNodeDefinition[]>>(
  (groups, definition) => {
    groups[definition.group] = groups[definition.group] || [];
    groups[definition.group].push(definition);
    return groups;
  },
  {}
);

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ graph, onChange }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(graph.nodes[0]?.id || null);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [connectionDrag, setConnectionDrag] = useState<ConnectionDrag | null>(null);
  const [draggingNode, setDraggingNode] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [canvasPan, setCanvasPan] = useState<CanvasPan | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [flexMessages, setFlexMessages] = useState<FlexMessageSummary[]>([]);
  const [testMessage, setTestMessage] = useState('預約');
  const [simMessages, setSimMessages] = useState<SimMessage[]>([
    { type: 'system', content: '輸入測試訊息後，這裡會顯示節點流程的模擬結果。' },
  ]);

  const viewport = useMemo(() => graph.viewport || { x: 40, y: 30, zoom: 1 }, [graph.viewport]);
  const validation = useMemo(() => validateWorkflowGraph(graph), [graph]);
  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) || null,
    [graph.nodes, selectedNodeId]
  );

  useEffect(() => {
    let mounted = true;
    void VisualEditorApi.getUserFlexMessagesSummary().then((messages) => {
      if (mounted) setFlexMessages(messages);
    }).catch(() => {
      if (mounted) setFlexMessages([]);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedNodeId && !graph.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(graph.nodes[0]?.id || null);
    }
  }, [graph.nodes, selectedNodeId]);

  useEffect(() => {
    if (!draggingNode && !canvasPan && !connectionDrag) return;

    const handleMove = (event: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (connectionDrag) {
        setConnectionDrag({
          ...connectionDrag,
          current: {
            x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
            y: (event.clientY - rect.top - viewport.y) / viewport.zoom,
          },
        });
        return;
      }

      if (canvasPan) {
        onChange({
          ...graph,
          viewport: {
            ...viewport,
            x: canvasPan.originX + event.clientX - canvasPan.startX,
            y: canvasPan.originY + event.clientY - canvasPan.startY,
          },
        });
        return;
      }

      if (draggingNode) {
        const nextPosition = {
          x: Math.max(0, Math.round((event.clientX - rect.left - viewport.x) / viewport.zoom - draggingNode.offsetX)),
          y: Math.max(0, Math.round((event.clientY - rect.top - viewport.y) / viewport.zoom - draggingNode.offsetY)),
        };

        onChange(updateWorkflowNodePosition(graph, draggingNode.nodeId, nextPosition));
      }
    };

    const handleUp = () => {
      if (connectionDrag) {
        const targetNode = graph.nodes.find((node) => {
          if (node.id === connectionDrag.nodeId || getWorkflowNodeKind(node.type) === 'trigger') return false;
          const inputPoint = getInputPoint(node);
          const nearInput = Math.hypot(inputPoint.x - connectionDrag.current.x, inputPoint.y - connectionDrag.current.y) < 80;
          const overCard =
            connectionDrag.current.x >= node.position.x - 24 &&
            connectionDrag.current.x <= node.position.x + NODE_WIDTH + 24 &&
            connectionDrag.current.y >= node.position.y - 16 &&
            connectionDrag.current.y <= node.position.y + 130;
          return nearInput || overCard;
        });

        if (targetNode) {
          const edge = createWorkflowEdge(connectionDrag.nodeId, connectionDrag.handleId, targetNode.id);
          onChange(upsertWorkflowEdge(graph, edge));
          setPendingConnection(null);
        }
      }

      if (draggingNode && pendingConnection && pendingConnection.nodeId !== draggingNode.nodeId) {
        const source = graph.nodes.find((node) => node.id === pendingConnection.nodeId);
        const target = graph.nodes.find((node) => node.id === draggingNode.nodeId);
        if (source && target) {
          const sourcePoint = getOutputPoint(source, pendingConnection.handleId);
          const targetPoint = getInputPoint(target);
          const distance = Math.hypot(sourcePoint.x - targetPoint.x, sourcePoint.y - targetPoint.y);
          if (distance < 96) {
            const edge = createWorkflowEdge(pendingConnection.nodeId, pendingConnection.handleId, draggingNode.nodeId);
            onChange(upsertWorkflowEdge(graph, edge));
            setPendingConnection(null);
          }
        }
      }

      setDraggingNode(null);
      setCanvasPan(null);
      setConnectionDrag(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [canvasPan, connectionDrag, draggingNode, graph, onChange, pendingConnection, viewport]);

  const setViewport = (nextViewport: typeof viewport) => {
    onChange({ ...graph, viewport: nextViewport });
  };

  const addNode = (type: WorkflowNodeType, position: { x: number; y: number }) => {
    const node = createWorkflowNode(type, position);
    onChange({ ...graph, nodes: [...graph.nodes, node] });
    setSelectedNodeId(node.id);
  };

  const updateNodeData = (nodeId: string, patch: Record<string, unknown>) => {
    onChange(updateWorkflowNodeData(graph, nodeId, patch));
  };

  const deleteNode = (nodeId: string) => {
    onChange(removeWorkflowNode(graph, nodeId));
    setPendingConnection(null);
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-workflow-node') as WorkflowNodeType;
    if (!type) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    addNode(type, {
      x: Math.round((event.clientX - rect.left - viewport.x) / viewport.zoom),
      y: Math.round((event.clientY - rect.top - viewport.y) / viewport.zoom),
    });
  };

  const connectToNode = (targetNode: WorkflowNode) => {
    const connection = connectionDrag || pendingConnection;
    if (!connection || connection.nodeId === targetNode.id) return;

    const edge = createWorkflowEdge(connection.nodeId, connection.handleId, targetNode.id);
    onChange(upsertWorkflowEdge(graph, edge));
    setPendingConnection(null);
    setConnectionDrag(null);
  };

  const runSimulation = () => {
    const messages = simulateGraph(graph, testMessage, flexMessages);
    setSimMessages([{ type: 'user', content: testMessage }, ...messages]);
  };

  const tidyNodes = () => {
    onChange(layoutWorkflowGraph(graph));
  };

  return (
    <div
      className={[
        'grid h-full min-h-0 overflow-hidden bg-[#f7fbf8] transition-[grid-template-columns] duration-200',
        inspectorOpen
          ? 'grid-cols-[280px_minmax(0,1fr)_330px]'
          : 'grid-cols-[280px_minmax(0,1fr)_48px]',
      ].join(' ')}
    >
      <NodeDrawer onAddNode={(type) => addNode(type, { x: 120, y: 120 + graph.nodes.length * 24 })} />

      <main className="flex min-w-0 flex-col border-x border-slate-200/80 bg-white/45">
        <div className="flex min-h-14 items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 backdrop-blur-xl">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950">節點畫布</div>
            <div className="truncate text-xs text-slate-500">
              {pendingConnection ? '拖曳連線到輸入端，或把目標節點移到連線點附近完成連接' : '按住空白畫布可平移，拖曳節點可移動位置'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={validation.isValid ? 'secondary' : 'destructive'} className="rounded-md">
              {validation.isValid ? '可儲存' : '需修正'}
            </Badge>
            <Button
              variant="outline"
              className="h-9 gap-2 px-3"
              onClick={tidyNodes}
              title="重新整理節點"
            >
              <GitBranch className="h-4 w-4" />
              整理節點
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setViewport({ ...viewport, zoom: Math.max(0.5, Number((viewport.zoom - 0.1).toFixed(2))) })}
              title="縮小"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setViewport({ ...viewport, zoom: Math.min(1.6, Number((viewport.zoom + 0.1).toFixed(2))) })}
              title="放大"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setViewport({ x: 40, y: 30, zoom: 1 })}
              title="重置視角"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={canvasRef}
          className={[
            'relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.14)_1px,transparent_0)] [background-size:24px_24px]',
            canvasPan ? 'cursor-grabbing' : 'cursor-grab',
          ].join(' ')}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleCanvasDrop}
          onClick={() => setPendingConnection(null)}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const target = event.target as HTMLElement;
            if (target.closest('[data-workflow-node="true"], [data-handle="true"], [data-edge-delete="true"]')) return;
            setPendingConnection(null);
            setCanvasPan({
              startX: event.clientX,
              startY: event.clientY,
              originX: viewport.x,
              originY: viewport.y,
            });
          }}
        >
          <style>{`
            @media (prefers-reduced-motion: reduce) {
              .workflow-flow-dot {
                display: none;
              }
            }
          `}</style>
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            }}
          >
            <WorkflowEdges
              edges={graph.edges}
              nodes={graph.nodes}
              connectionDrag={connectionDrag}
              onDeleteEdge={(edgeId) => onChange(removeWorkflowEdge(graph, edgeId))}
            />

            {graph.nodes.map((node) => (
              <WorkflowNodeCard
                key={node.id}
                node={node}
                selected={node.id === selectedNodeId}
                pendingConnection={pendingConnection}
                connectionDrag={connectionDrag}
                onSelect={() => setSelectedNodeId(node.id)}
                onStartDrag={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest('[data-handle="true"]')) return;
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setSelectedNodeId(node.id);
                  setDraggingNode({
                    nodeId: node.id,
                    offsetX: (event.clientX - rect.left - viewport.x) / viewport.zoom - node.position.x,
                    offsetY: (event.clientY - rect.top - viewport.y) / viewport.zoom - node.position.y,
                  });
                }}
                onStartConnection={(handleId, event) => {
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const current = {
                    x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
                    y: (event.clientY - rect.top - viewport.y) / viewport.zoom,
                  };
                  setPendingConnection({ nodeId: node.id, handleId });
                  setConnectionDrag({ nodeId: node.id, handleId, current });
                }}
                onConnectOutput={(handleId) => setPendingConnection({ nodeId: node.id, handleId })}
                onConnectInput={() => connectToNode(node)}
                onDelete={() => deleteNode(node.id)}
              />
            ))}
          </div>
        </div>
      </main>

      <WorkflowInspector
        graph={graph}
        node={selectedNode}
        validation={validation}
        flexMessages={flexMessages}
        testMessage={testMessage}
        simMessages={simMessages}
        onTestMessageChange={setTestMessage}
        onRunSimulation={runSimulation}
        onUpdateNode={updateNodeData}
        onDeleteNode={deleteNode}
        open={inspectorOpen}
        onToggleOpen={() => setInspectorOpen((open) => !open)}
      />
    </div>
  );
};

const NodeDrawer: React.FC<{
  onAddNode: (type: WorkflowNodeType) => void;
}> = ({ onAddNode }) => (
  <aside className="flex min-h-0 flex-col bg-white/75 backdrop-blur-xl">
    <div className="border-b border-slate-200/80 p-4">
      <div className="text-sm font-semibold text-slate-950">元件抽屜</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">拖到畫布或點擊新增節點</div>
    </div>
    <ScrollArea className="min-h-0 flex-1 p-3">
      {Object.entries(groupedDefinitions).map(([group, definitions]) => (
        <section key={group} className="mb-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-slate-500">{group}</div>
          <div className="space-y-2">
            {definitions.map((definition) => {
              const Icon = iconByType[definition.type];
              return (
                <button
                  key={definition.type}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-workflow-node', definition.type);
                  }}
                  onClick={() => onAddNode(definition.type)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-md border ${definition.accentClass}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{definition.label}</div>
                      <div className="truncate text-xs text-slate-500">{definition.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </ScrollArea>
  </aside>
);

const WorkflowNodeCard: React.FC<{
  node: WorkflowNode;
  selected: boolean;
  pendingConnection: PendingConnection | null;
  connectionDrag: ConnectionDrag | null;
  onSelect: () => void;
  onStartDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  onStartConnection: (handleId: string, event: React.PointerEvent<HTMLButtonElement>) => void;
  onConnectOutput: (handleId: string) => void;
  onConnectInput: () => void;
  onDelete: () => void;
}> = ({
  node,
  selected,
  pendingConnection,
  connectionDrag,
  onSelect,
  onStartDrag,
  onStartConnection,
  onConnectOutput,
  onConnectInput,
  onDelete,
}) => {
  const definition = getWorkflowNodeDefinition(node.type);
  const Icon = iconByType[node.type];
  const outputs = getWorkflowOutputHandles(node.type);
  const inputs = getWorkflowInputHandles(node.type);

  return (
    <div
      data-workflow-node="true"
      className={[
        'group/node absolute rounded-lg border bg-white shadow-[0_18px_46px_rgba(15,23,42,0.12)] transition',
        selected ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-200',
      ].join(' ')}
      style={{ left: node.position.x, top: node.position.y, width: NODE_WIDTH }}
      onPointerDown={onStartDrag}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {inputs.map((handle) => (
        <button
          key={handle.id}
          data-handle="true"
          className={[
            'absolute -left-3 top-12 h-6 w-6 rounded-full border bg-white shadow-sm',
            pendingConnection ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-300',
          ].join(' ')}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => {
            event.stopPropagation();
            if (connectionDrag || pendingConnection) onConnectInput();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onConnectInput();
          }}
          title="連接到此節點"
        />
      ))}

      <div className="cursor-grab rounded-t-lg border-b border-slate-100 bg-slate-50 px-3 py-2 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${definition.accentClass}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-950">{String(node.data.label || definition.label)}</div>
            <div className="truncate text-xs text-slate-500">{definition.group}</div>
          </div>
          <button
            data-workflow-node="true"
            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all duration-150 hover:bg-rose-50 hover:text-rose-500 group-hover/node:opacity-100"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            title="刪除節點"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-2 px-3 py-3 text-xs text-slate-600">
        <NodeSummary node={node} />
      </div>

      {outputs.map((handle, index) => (
        <button
          key={handle.id}
          data-handle="true"
          className="absolute -right-3 h-6 w-6 rounded-full border border-emerald-500 bg-emerald-50 shadow-sm transition hover:scale-110"
          style={{ top: 48 + index * 32 }}
          onPointerDown={(event) => {
            event.stopPropagation();
            onStartConnection(handle.id, event);
          }}
          onClick={(event) => {
            event.stopPropagation();
            onConnectOutput(handle.id);
          }}
          title={`從「${handle.label}」連出去`}
        >
          <span className="sr-only">{handle.label}</span>
        </button>
      ))}
    </div>
  );
};

const NodeSummary: React.FC<{ node: WorkflowNode }> = ({ node }) => {
  switch (node.type) {
    case 'trigger.message':
      return <div>模式：{node.data.matchMode === 'any' ? '任何文字' : String(node.data.pattern || '未設定')}</div>;
    case 'trigger.postback':
      return <div>Data：{String(node.data.data || '任何 postback')}</div>;
    case 'condition.keyword':
      return <div>關鍵字：{String(node.data.keywords || '未設定')}</div>;
    case 'action.replyText':
      return <div className="line-clamp-2">文字：{String(node.data.text || '未設定')}</div>;
    case 'action.replyImage':
      return <div>圖片：{node.data.originalContentUrl ? '已設定' : '未設定'}</div>;
    case 'action.replySticker':
      return <div>貼圖：{String(node.data.packageId || '-')}/{String(node.data.stickerId || '-')}</div>;
    case 'action.replyFlex':
      return <div>Flex：{String(node.data.flexMessageName || '未選擇')}</div>;
    case 'action.aiTakeover':
      return <div>使用 Bot 的 AI 知識庫接管設定</div>;
    case 'action.setVariable':
      return <div>{String(node.data.variableName || '變數')} = {String(node.data.variableValue || '')}</div>;
    case 'action.wait':
      return <div>等待 {String(node.data.duration || 1)} {node.data.unit === 'minutes' ? '分鐘' : node.data.unit === 'milliseconds' ? '毫秒' : '秒'}</div>;
    case 'action.webhook':
      return <div className="truncate">{String(node.data.method || 'POST')} {String(node.data.url || '未設定 URL')}</div>;
    default:
      return <div>未設定</div>;
  }
};

const WorkflowEdges: React.FC<{
  edges: WorkflowEdge[];
  nodes: WorkflowNode[];
  connectionDrag: ConnectionDrag | null;
  onDeleteEdge: (edgeId: string) => void;
}> = ({ edges, nodes, connectionDrag, onDeleteEdge }) => {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  return (
    <svg className="absolute inset-0 overflow-visible" width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
      <defs>
        <marker id="workflow-arrow-true" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="#10b981" />
        </marker>
        <marker id="workflow-arrow-false" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="#ef4444" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return null;

        const { x: startX, y: startY } = getOutputPoint(source, edge.sourceHandle);
        const { x: endX, y: endY } = getInputPoint(target);
        const c1 = startX + Math.max(80, (endX - startX) / 2);
        const c2 = endX - Math.max(80, (endX - startX) / 2);
        const path = `M ${startX} ${startY} C ${c1} ${startY}, ${c2} ${endY}, ${endX} ${endY}`;
        const pathId = `workflow-path-${edge.id}`;
        const labelX = (startX + endX) / 2;
        const labelY = (startY + endY) / 2;
        const isFalsePath = edge.sourceHandle === 'false';
        const stroke = isFalsePath ? '#ef4444' : '#10b981';
        const isHovered = hoveredEdgeId === edge.id;

        return (
          <g
            key={edge.id}
            onMouseEnter={() => setHoveredEdgeId(edge.id)}
            onMouseLeave={() => setHoveredEdgeId(null)}
          >
            <path
              id={pathId}
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth={isHovered ? '2.4' : '1.6'}
              strokeLinecap="round"
              markerEnd={`url(#${isFalsePath ? 'workflow-arrow-false' : 'workflow-arrow-true'})`}
              style={{ transition: 'stroke-width 0.15s ease, opacity 0.15s ease' }}
              opacity={isHovered ? 1 : 0.75}
            />
            {/* 透明寬路徑，放大 hover 觸發區域 */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth="16"
              style={{ cursor: 'pointer' }}
            />
            <AnimatedFlowDots pathId={pathId} color={stroke} />
            {edge.sourceHandle !== 'out' && (
              <text x={labelX} y={labelY - 10} textAnchor="middle" className="fill-slate-600 text-[11px] font-semibold">
                {edge.sourceHandle === 'true' ? '符合' : '不符合'}
              </text>
            )}
            <foreignObject
              x={labelX - 13}
              y={labelY + 2}
              width="26"
              height="26"
              style={{
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'scale(1)' : 'scale(0.7)',
                transformOrigin: `${labelX}px ${labelY + 15}px`,
                transition: 'opacity 0.15s ease, transform 0.15s ease',
                pointerEvents: isHovered ? 'auto' : 'none',
              }}
            >
              <button
                data-edge-delete="true"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-400 shadow-md transition-colors duration-100 hover:border-rose-400 hover:bg-rose-500 hover:text-white"
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteEdge(edge.id);
                }}
                title="刪除連線"
              >
                <Trash2 style={{ width: '11px', height: '11px' }} />
              </button>
            </foreignObject>
          </g>
        );
      })}
      {connectionDrag && nodeMap.get(connectionDrag.nodeId) ? (
        <PendingConnectionPath source={nodeMap.get(connectionDrag.nodeId)!} connectionDrag={connectionDrag} />
      ) : null}
    </svg>
  );
};

const PendingConnectionPath: React.FC<{
  source: WorkflowNode;
  connectionDrag: ConnectionDrag;
}> = ({ source, connectionDrag }) => {
  const start = getOutputPoint(source, connectionDrag.handleId);
  const end = connectionDrag.current;
  const c1 = start.x + Math.max(80, (end.x - start.x) / 2);
  const c2 = end.x - Math.max(80, (end.x - start.x) / 2);
  const pathId = 'workflow-pending-path';
  const path = `M ${start.x} ${start.y} C ${c1} ${start.y}, ${c2} ${end.y}, ${end.x} ${end.y}`;

  return (
    <g>
      <path
        id={pathId}
        d={path}
        fill="none"
        stroke="#059669"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.85"
      />
      <AnimatedFlowDots pathId={pathId} color="#059669" duration={1.7} />
    </g>
  );
};

const AnimatedFlowDots: React.FC<{
  pathId: string;
  color: string;
  duration?: number;
}> = ({ pathId, color, duration = 2.8 }) => {
  const offsets = [0, duration / 3, (duration * 2) / 3];

  return (
    <>
      {offsets.map((offset) => (
        <circle key={`${pathId}-${offset}`} className="workflow-flow-dot" r="3.1" fill={color} opacity="0">
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            begin={`-${offset}s`}
            calcMode="linear"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
          <animate
            attributeName="opacity"
            values="0;0.9;0.9;0"
            keyTimes="0;0.08;0.92;1"
            dur={`${duration}s`}
            repeatCount="indefinite"
            begin={`-${offset}s`}
          />
        </circle>
      ))}
    </>
  );
};

const WorkflowInspector: React.FC<{
  graph: WorkflowGraph;
  node: WorkflowNode | null;
  validation: ReturnType<typeof validateWorkflowGraph>;
  flexMessages: FlexMessageSummary[];
  testMessage: string;
  simMessages: SimMessage[];
  onTestMessageChange: (value: string) => void;
  onRunSimulation: () => void;
  onUpdateNode: (nodeId: string, patch: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  open: boolean;
  onToggleOpen: () => void;
}> = ({
  graph,
  node,
  validation,
  flexMessages,
  testMessage,
  simMessages,
  onTestMessageChange,
  onRunSimulation,
  onUpdateNode,
  onDeleteNode,
  open,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState('settings');
  const selectedInspectorNodeId = node?.id;

  useEffect(() => {
    if (selectedInspectorNodeId) setActiveTab('settings');
  }, [selectedInspectorNodeId]);

  if (!open) {
    return (
      <aside className="flex min-h-0 flex-col items-center border-l border-slate-200/80 bg-white/80 py-3 backdrop-blur-xl">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={onToggleOpen} title="展開屬性面板">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="mt-4 [writing-mode:vertical-rl] text-xs font-semibold tracking-normal text-slate-500">
          屬性面板
        </div>
      </aside>
    );
  }

  return (
  <aside className="flex min-h-0 flex-col bg-white/80 backdrop-blur-xl">
    <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 p-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-950">屬性面板</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">
          {node ? getWorkflowNodeDefinition(node.type).description : '選擇節點後編輯內容'}
        </div>
      </div>
      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={onToggleOpen} title="收合屬性面板">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>

    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="mx-3 mt-3 grid h-10 shrink-0 grid-cols-3 rounded-lg bg-slate-100 p-1">
        <TabsTrigger value="settings" className="h-8 gap-1.5 rounded-md px-2 text-xs">
          <Settings className="h-3.5 w-3.5" />
          屬性
        </TabsTrigger>
        <TabsTrigger value="check" className="h-8 gap-1.5 rounded-md px-2 text-xs">
          <CheckCircleStatus valid={validation.isValid} />
          檢查
        </TabsTrigger>
        <TabsTrigger value="test" className="h-8 gap-1.5 rounded-md px-2 text-xs">
          <Play className="h-3.5 w-3.5" />
          測試
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" animationDisabled className="m-0 min-h-0 flex-1 overflow-hidden p-0 data-[state=inactive]:hidden">
        <ScrollArea className="h-full p-4">
          {node ? (
            <div className="space-y-5">
              <InspectorField label="節點名稱">
                <Input
                  value={String(node.data.label || '')}
                  onChange={(event) => onUpdateNode(node.id, { label: event.target.value })}
                />
              </InspectorField>

              <NodeDataEditor node={node} flexMessages={flexMessages} onUpdateNode={onUpdateNode} />

              <div className="border-t border-slate-200 pt-5">
                <Button
                  variant="outline"
                  className="w-full justify-center border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => onDeleteNode(node.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  刪除節點
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              尚未選擇任何節點。
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="check" animationDisabled className="m-0 min-h-0 flex-1 overflow-hidden p-0 data-[state=inactive]:hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <div className="text-sm font-semibold text-slate-950">流程檢查</div>
              <div className="mt-1 text-xs text-slate-500">
                節點 {graph.nodes.length} 個，連線 {graph.edges.length} 條
              </div>
            </div>

            {[...validation.errors, ...validation.warnings].length === 0 ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">目前流程沒有明顯問題。</div>
            ) : (
              <div className="space-y-2">
                {validation.errors.map((error) => (
                  <div key={error} className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
                ))}
                {validation.warnings.map((warning) => (
                  <div key={warning} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{warning}</div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="test" animationDisabled className="m-0 min-h-0 flex-1 overflow-hidden p-0 data-[state=inactive]:hidden">
        <div className="flex h-full min-h-0 flex-col p-4">
          <div className="shrink-0 space-y-3 rounded-lg border border-slate-200 bg-white/80 p-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">快速測試</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                輸入使用者訊息，查看目前流程會如何回應。
              </div>
            </div>
            <div className="flex gap-2">
              <Input value={testMessage} onChange={(event) => onTestMessageChange(event.target.value)} />
              <Button className="app-primary-button h-10 px-3" onClick={onRunSimulation} title="執行測試">
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg bg-slate-50 p-3">
            <div className="space-y-2">
              {simMessages.map((message, index) => (
                <div
                  key={`${message.type}-${index}`}
                  className={[
                    'rounded-md px-3 py-2 text-xs leading-5',
                    message.type === 'user'
                      ? 'ml-6 bg-blue-500 text-white'
                      : message.type === 'bot'
                        ? 'mr-6 bg-white text-slate-700 shadow-sm'
                        : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
                >
                  {message.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </aside>
  );
};

const CheckCircleStatus: React.FC<{ valid: boolean }> = ({ valid }) => (
  <span
    className={[
      'h-3.5 w-3.5 rounded-full border',
      valid ? 'border-emerald-500 bg-emerald-100' : 'border-rose-500 bg-rose-100',
    ].join(' ')}
  />
);

const NodeDataEditor: React.FC<{
  node: WorkflowNode;
  flexMessages: FlexMessageSummary[];
  onUpdateNode: (nodeId: string, patch: Record<string, unknown>) => void;
}> = ({ node, flexMessages, onUpdateNode }) => {
  const patch = (data: Record<string, unknown>) => onUpdateNode(node.id, data);

  switch (node.type) {
    case 'trigger.message':
      return (
        <>
          <InspectorField label="觸發模式">
            <Select value={String(node.data.matchMode || 'any')} onValueChange={(value) => patch({ matchMode: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">任何文字訊息</SelectItem>
                <SelectItem value="contains">包含文字</SelectItem>
                <SelectItem value="exact">完全符合</SelectItem>
              </SelectContent>
            </Select>
          </InspectorField>
          {node.data.matchMode !== 'any' && (
            <InspectorField label="觸發文字">
              <Input value={String(node.data.pattern || '')} onChange={(event) => patch({ pattern: event.target.value })} />
            </InspectorField>
          )}
        </>
      );

    case 'trigger.postback':
      return (
        <InspectorField label="Postback data">
          <Input value={String(node.data.data || '')} onChange={(event) => patch({ data: event.target.value })} placeholder="留空代表任何 postback" />
        </InspectorField>
      );

    case 'condition.keyword':
      return (
        <>
          <InspectorField label="關鍵字">
            <Textarea
              value={String(node.data.keywords || '')}
              onChange={(event) => patch({ keywords: event.target.value })}
              placeholder="預約, 訂位, booking"
              rows={3}
            />
          </InspectorField>
          <InspectorField label="匹配模式">
            <Select value={String(node.data.matchMode || 'contains')} onValueChange={(value) => patch({ matchMode: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">包含任一關鍵字</SelectItem>
                <SelectItem value="exact">完全符合任一關鍵字</SelectItem>
                <SelectItem value="startsWith">以關鍵字開頭</SelectItem>
                <SelectItem value="endsWith">以關鍵字結尾</SelectItem>
                <SelectItem value="regex">正則表達式</SelectItem>
              </SelectContent>
            </Select>
          </InspectorField>
          <InspectorField label="區分大小寫" horizontal>
            <Switch checked={Boolean(node.data.caseSensitive)} onCheckedChange={(checked) => patch({ caseSensitive: checked })} />
          </InspectorField>
        </>
      );

    case 'action.replyText':
      return (
        <InspectorField label="回覆內容">
          <Textarea value={String(node.data.text || '')} onChange={(event) => patch({ text: event.target.value })} rows={5} />
        </InspectorField>
      );

    case 'action.replyImage':
      return (
        <>
          <InspectorField label="原始圖片 URL">
            <Input value={String(node.data.originalContentUrl || '')} onChange={(event) => patch({ originalContentUrl: event.target.value })} />
          </InspectorField>
          <InspectorField label="預覽圖片 URL">
            <Input value={String(node.data.previewImageUrl || '')} onChange={(event) => patch({ previewImageUrl: event.target.value })} />
          </InspectorField>
        </>
      );

    case 'action.replySticker':
      return (
        <div className="grid grid-cols-2 gap-3">
          <InspectorField label="Package ID">
            <Input value={String(node.data.packageId || '')} onChange={(event) => patch({ packageId: event.target.value })} />
          </InspectorField>
          <InspectorField label="Sticker ID">
            <Input value={String(node.data.stickerId || '')} onChange={(event) => patch({ stickerId: event.target.value })} />
          </InspectorField>
        </div>
      );

    case 'action.replyFlex':
      return (
        <>
          <InspectorField label="Flex Message 範本">
            <Select
              value={String(node.data.flexMessageId || '')}
              onValueChange={(value) => {
                const selected = flexMessages.find((message) => message.id === value);
                patch({ flexMessageId: value, flexMessageName: selected?.name || '' });
              }}
            >
              <SelectTrigger><SelectValue placeholder="選擇 Flex Message" /></SelectTrigger>
              <SelectContent>
                {flexMessages.length === 0 ? (
                  <SelectItem value="no-flex" disabled>沒有可用的 Flex Message</SelectItem>
                ) : (
                  flexMessages.map((message) => (
                    <SelectItem key={message.id} value={message.id}>{message.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </InspectorField>
          <InspectorField label="Alt text">
            <Input value={String(node.data.altText || '')} onChange={(event) => patch({ altText: event.target.value })} />
          </InspectorField>
        </>
      );

    case 'action.aiTakeover':
      return (
        <div className="rounded-lg bg-fuchsia-50 p-3 text-sm leading-6 text-fuchsia-800">
          此節點會要求 webhook 排程 AI 接管。實際模型、知識庫與 system prompt 使用 Bot 的 AI 知識庫設定。
        </div>
      );

    case 'action.setVariable':
      return (
        <>
          <InspectorField label="變數名稱">
            <Input value={String(node.data.variableName || '')} onChange={(event) => patch({ variableName: event.target.value })} />
          </InspectorField>
          <InspectorField label="變數值">
            <Input value={String(node.data.variableValue || '')} onChange={(event) => patch({ variableValue: event.target.value })} />
          </InspectorField>
        </>
      );

    case 'action.wait':
      return (
        <div className="grid grid-cols-2 gap-3">
          <InspectorField label="時間">
            <Input type="number" min="1" value={String(node.data.duration || 1)} onChange={(event) => patch({ duration: Number(event.target.value) || 1 })} />
          </InspectorField>
          <InspectorField label="單位">
            <Select value={String(node.data.unit || 'seconds')} onValueChange={(value) => patch({ unit: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="milliseconds">毫秒</SelectItem>
                <SelectItem value="seconds">秒</SelectItem>
                <SelectItem value="minutes">分鐘</SelectItem>
              </SelectContent>
            </Select>
          </InspectorField>
        </div>
      );

    case 'action.webhook':
      return (
        <>
          <InspectorField label="方法">
            <Select value={String(node.data.method || 'POST')} onValueChange={(value) => patch({ method: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </InspectorField>
          <InspectorField label="URL">
            <Input value={String(node.data.url || '')} onChange={(event) => patch({ url: event.target.value })} />
          </InspectorField>
          <InspectorField label="Headers">
            <Textarea value={String(node.data.headersText || '')} onChange={(event) => patch({ headersText: event.target.value })} placeholder="Authorization: Bearer ..." rows={4} />
          </InspectorField>
          <InspectorField label="Body">
            <Textarea value={String(node.data.body || '')} onChange={(event) => patch({ body: event.target.value })} rows={5} />
          </InspectorField>
        </>
      );

    default:
      return null;
  }
};

const InspectorField: React.FC<{
  label: string;
  children: React.ReactNode;
  horizontal?: boolean;
}> = ({ label, children, horizontal = false }) => (
  <label className={horizontal ? 'flex items-center justify-between gap-3' : 'block space-y-2'}>
    <span className="text-xs font-semibold text-slate-500">{label}</span>
    {children}
  </label>
);

function getOutputPoint(node: WorkflowNode, handleId: string): { x: number; y: number } {
  const outputs = getWorkflowOutputHandles(node.type);
  const outputIndex = Math.max(0, outputs.findIndex((handle) => handle.id === handleId));
  return {
    x: node.position.x + NODE_WIDTH,
    y: node.position.y + 60 + outputIndex * 32,
  };
}

function getInputPoint(node: WorkflowNode): { x: number; y: number } {
  return {
    x: node.position.x,
    y: node.position.y + 60,
  };
}

function layoutWorkflowGraph(graph: WorkflowGraph): WorkflowGraph {
  if (graph.nodes.length === 0) {
    return { ...graph, viewport: { x: 40, y: 30, zoom: 1 } };
  }

  const outgoing = new Map<string, WorkflowEdge[]>();
  const incomingCount = new Map<string, number>();
  graph.nodes.forEach((node) => incomingCount.set(node.id, 0));

  graph.edges.forEach((edge) => {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge]);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
  });

  const triggers = graph.nodes.filter((node) => getWorkflowNodeKind(node.type) === 'trigger');
  const roots = triggers.length > 0
    ? triggers
    : graph.nodes.filter((node) => (incomingCount.get(node.id) || 0) === 0);

  const levels = new Map<string, number>();
  const queue = roots.map((node) => ({ id: node.id, level: 0 }));
  let layoutSteps = 0;
  const maxLayoutSteps = Math.max(50, graph.nodes.length * Math.max(1, graph.edges.length + 1));

  while (queue.length > 0 && layoutSteps < maxLayoutSteps) {
    layoutSteps += 1;
    const current = queue.shift()!;
    const existingLevel = levels.get(current.id);
    if (existingLevel !== undefined && existingLevel <= current.level) continue;

    levels.set(current.id, current.level);
    (outgoing.get(current.id) || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((edge) => queue.push({ id: edge.target, level: current.level + 1 }));
  }

  graph.nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, Math.max(0, ...Array.from(levels.values())) + 1);
    }
  });

  const columns = new Map<number, WorkflowNode[]>();
  graph.nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    columns.set(level, [...(columns.get(level) || []), node]);
  });

  const sortedColumnEntries = Array.from(columns.entries()).sort(([a], [b]) => a - b);
  const nextNodes = graph.nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    const column = columns.get(level) || [];
    const sortedColumn = [...column].sort((a, b) => {
      const aKind = getWorkflowNodeKind(a.type);
      const bKind = getWorkflowNodeKind(b.type);
      if (aKind !== bKind) return aKind === 'trigger' ? -1 : bKind === 'trigger' ? 1 : 0;
      return a.position.y - b.position.y;
    });
    const index = sortedColumn.findIndex((candidate) => candidate.id === node.id);
    return {
      ...node,
      position: {
        x: 80 + level * 340,
        y: 80 + Math.max(0, index) * 170,
      },
    };
  });

  const tallestColumnCount = Math.max(1, ...sortedColumnEntries.map(([, nodes]) => nodes.length));
  const centeredY = Math.max(30, 120 - Math.min(80, tallestColumnCount * 8));

  return {
    ...graph,
    viewport: { x: 44, y: centeredY, zoom: 1 },
    nodes: nextNodes,
  };
}

function simulateGraph(graph: WorkflowGraph, userMessage: string, flexMessages: FlexMessageSummary[]): SimMessage[] {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const trigger = graph.nodes.find((node) => {
    if (node.type !== 'trigger.message') return false;
    const mode = String(node.data.matchMode || 'any');
    const pattern = String(node.data.pattern || '');
    if (mode === 'any' || !pattern) return true;
    return matchText(userMessage, pattern, mode, Boolean(node.data.caseSensitive));
  });

  if (!trigger) {
    return [{ type: 'bot', content: '沒有符合的文字觸發節點。' }];
  }

  const result: SimMessage[] = [];
  const queue = graph.edges
    .filter((edge) => edge.source === trigger.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((edge) => edge.target);
  const visited = new Set<string>();
  let steps = 0;

  while (queue.length > 0 && steps < 30) {
    steps += 1;
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    let handle = 'out';

    if (node.type === 'condition.keyword') {
      handle = matchText(
        userMessage,
        String(node.data.keywords || ''),
        String(node.data.matchMode || 'contains'),
        Boolean(node.data.caseSensitive)
      ) ? 'true' : 'false';
    } else if (node.type === 'action.replyText') {
      result.push({ type: 'bot', content: String(node.data.text || '空的回覆內容') });
    } else if (node.type === 'action.replyFlex') {
      const name = node.data.flexMessageName || flexMessages.find((message) => message.id === node.data.flexMessageId)?.name;
      result.push({ type: 'bot', content: `Flex 訊息：${String(name || '未選擇範本')}` });
    } else if (node.type === 'action.replyImage') {
      result.push({ type: 'bot', content: `圖片：${String(node.data.previewImageUrl || node.data.originalContentUrl || '未設定 URL')}` });
    } else if (node.type === 'action.replySticker') {
      result.push({ type: 'bot', content: `貼圖：${String(node.data.packageId || '-')}/${String(node.data.stickerId || '-')}` });
    } else if (node.type === 'action.aiTakeover') {
      result.push({ type: 'bot', content: '交給 AI 知識庫接管' });
      continue;
    } else if (node.type === 'action.webhook') {
      result.push({ type: 'system', content: `呼叫 API：${String(node.data.method || 'POST')} ${String(node.data.url || '未設定 URL')}` });
    } else if (node.type === 'action.setVariable') {
      result.push({ type: 'system', content: `設定變數 ${String(node.data.variableName || '')}` });
    } else if (node.type === 'action.wait') {
      result.push({ type: 'system', content: `等待 ${String(node.data.duration || 1)} ${String(node.data.unit || 'seconds')}` });
    }

    graph.edges
      .filter((edge) => edge.source === node.id && edge.sourceHandle === handle)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((edge) => queue.push(edge.target));
  }

  return result.length > 0 ? result : [{ type: 'bot', content: '流程有命中，但沒有產生回覆動作。' }];
}

function matchText(message: string, patternText: string, mode: string, caseSensitive: boolean): boolean {
  const patterns = patternText.split(',').map((value) => value.trim()).filter(Boolean);
  if (patterns.length === 0) return true;

  const target = caseSensitive ? message : message.toLowerCase();

  return patterns.some((pattern) => {
    const probe = caseSensitive ? pattern : pattern.toLowerCase();
    if (mode === 'exact') return target === probe;
    if (mode === 'startsWith') return target.startsWith(probe);
    if (mode === 'endsWith') return target.endsWith(probe);
    if (mode === 'regex') {
      try {
        return new RegExp(pattern, caseSensitive ? '' : 'i').test(message);
      } catch {
        return false;
      }
    }
    return target.includes(probe);
  });
}

export default WorkflowBuilder;
