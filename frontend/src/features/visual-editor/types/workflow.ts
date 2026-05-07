export type WorkflowSchemaVersion = 'workflow-graph/v1';

export type WorkflowNodeKind = 'trigger' | 'condition' | 'action';

export type WorkflowNodeType =
  | 'trigger.message'
  | 'trigger.follow'
  | 'trigger.postback'
  | 'trigger.image'
  | 'condition.keyword'
  | 'action.replyText'
  | 'action.replyImage'
  | 'action.replySticker'
  | 'action.replyFlex'
  | 'action.aiTakeover'
  | 'action.setVariable'
  | 'action.wait'
  | 'action.webhook';

export interface WorkflowPosition {
  x: number;
  y: number;
}

export interface WorkflowViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: WorkflowPosition;
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  order?: number;
}

export interface WorkflowGraph {
  schemaVersion: WorkflowSchemaVersion;
  viewport?: WorkflowViewport;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNodeDefinition {
  type: WorkflowNodeType;
  kind: WorkflowNodeKind;
  label: string;
  description: string;
  group: '觸發' | '邏輯' | '動作';
  accentClass: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const WORKFLOW_NODE_DEFINITIONS: WorkflowNodeDefinition[] = [
  {
    type: 'trigger.message',
    kind: 'trigger',
    label: '收到文字訊息',
    description: 'LINE 文字訊息進入流程',
    group: '觸發',
    accentClass: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  {
    type: 'trigger.follow',
    kind: 'trigger',
    label: '加入好友',
    description: '使用者加入好友時觸發',
    group: '觸發',
    accentClass: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  {
    type: 'trigger.postback',
    kind: 'trigger',
    label: '按鈕回傳',
    description: 'Flex / Template postback 事件',
    group: '觸發',
    accentClass: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  {
    type: 'trigger.image',
    kind: 'trigger',
    label: '收到圖片',
    description: 'LINE 圖片訊息進入流程',
    group: '觸發',
    accentClass: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  {
    type: 'condition.keyword',
    kind: 'condition',
    label: '條件分支',
    description: '依訊息內容分成符合 / 不符合',
    group: '邏輯',
    accentClass: 'border-violet-300 bg-violet-50 text-violet-800',
  },
  {
    type: 'action.replyText',
    kind: 'action',
    label: '回覆文字',
    description: '傳送一則文字訊息',
    group: '動作',
    accentClass: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  },
  {
    type: 'action.replyImage',
    kind: 'action',
    label: '回覆圖片',
    description: '傳送圖片訊息',
    group: '動作',
    accentClass: 'border-sky-300 bg-sky-50 text-sky-800',
  },
  {
    type: 'action.replySticker',
    kind: 'action',
    label: '回覆貼圖',
    description: '傳送 LINE 貼圖',
    group: '動作',
    accentClass: 'border-sky-300 bg-sky-50 text-sky-800',
  },
  {
    type: 'action.replyFlex',
    kind: 'action',
    label: '回覆 Flex',
    description: '引用既有 Flex Message 範本',
    group: '動作',
    accentClass: 'border-sky-300 bg-sky-50 text-sky-800',
  },
  {
    type: 'action.aiTakeover',
    kind: 'action',
    label: '交給 AI',
    description: '把這次訊息交給 AI 知識庫回覆',
    group: '動作',
    accentClass: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800',
  },
  {
    type: 'action.setVariable',
    kind: 'action',
    label: '設定變數',
    description: '在本次流程中寫入暫存變數',
    group: '動作',
    accentClass: 'border-slate-300 bg-slate-50 text-slate-800',
  },
  {
    type: 'action.wait',
    kind: 'action',
    label: '等待',
    description: '延遲後再繼續往下執行',
    group: '動作',
    accentClass: 'border-slate-300 bg-slate-50 text-slate-800',
  },
  {
    type: 'action.webhook',
    kind: 'action',
    label: '呼叫 API',
    description: '向外部 Webhook / API 發送請求',
    group: '動作',
    accentClass: 'border-blue-300 bg-blue-50 text-blue-800',
  },
];

const defaultViewport: WorkflowViewport = { x: 40, y: 30, zoom: 1 };

export function generateWorkflowId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getWorkflowNodeDefinition(type: WorkflowNodeType): WorkflowNodeDefinition {
  return (
    WORKFLOW_NODE_DEFINITIONS.find((definition) => definition.type === type) ||
    WORKFLOW_NODE_DEFINITIONS[0]
  );
}

export function getWorkflowNodeKind(type: WorkflowNodeType): WorkflowNodeKind {
  return getWorkflowNodeDefinition(type).kind;
}

export function getWorkflowOutputHandles(type: WorkflowNodeType): Array<{ id: string; label: string }> {
  if (type === 'condition.keyword') {
    return [
      { id: 'true', label: '符合' },
      { id: 'false', label: '不符合' },
    ];
  }

  if (type === 'action.aiTakeover') {
    return [];
  }

  return [{ id: 'out', label: '下一步' }];
}

export function getWorkflowInputHandles(type: WorkflowNodeType): Array<{ id: string; label: string }> {
  return getWorkflowNodeKind(type) === 'trigger' ? [] : [{ id: 'in', label: '輸入' }];
}

export function createWorkflowNode(type: WorkflowNodeType, position: WorkflowPosition): WorkflowNode {
  const definition = getWorkflowNodeDefinition(type);

  return {
    id: generateWorkflowId('node'),
    type,
    position,
    data: {
      label: definition.label,
      ...getDefaultNodeData(type),
    },
  };
}

export function createWorkflowEdge(source: string, sourceHandle: string, target: string): WorkflowEdge {
  return {
    id: generateWorkflowId('edge'),
    source,
    sourceHandle,
    target,
    targetHandle: 'in',
  };
}

export function createEmptyWorkflowGraph(): WorkflowGraph {
  return {
    schemaVersion: 'workflow-graph/v1',
    viewport: defaultViewport,
    nodes: [],
    edges: [],
  };
}

export function createStarterWorkflowGraph(): WorkflowGraph {
  const trigger: WorkflowNode = {
    id: generateWorkflowId('node'),
    type: 'trigger.message',
    position: { x: 80, y: 220 },
    data: { label: '收到文字訊息', matchMode: 'any', pattern: '' },
  };
  const condition: WorkflowNode = {
    id: generateWorkflowId('node'),
    type: 'condition.keyword',
    position: { x: 390, y: 200 },
    data: { label: '條件分支', keywords: '預約, 訂位, booking', matchMode: 'contains', caseSensitive: false },
  };
  const reply: WorkflowNode = {
    id: generateWorkflowId('node'),
    type: 'action.replyText',
    position: { x: 720, y: 120 },
    data: { label: '回覆文字', text: '好的，請問想預約哪一天？' },
  };
  const ai: WorkflowNode = {
    id: generateWorkflowId('node'),
    type: 'action.aiTakeover',
    position: { x: 720, y: 300 },
    data: { label: '交給 AI', note: '走 Bot 的 AI 知識庫接管設定' },
  };

  return {
    schemaVersion: 'workflow-graph/v1',
    viewport: defaultViewport,
    nodes: [trigger, condition, reply, ai],
    edges: [
      { id: generateWorkflowId('edge'), source: trigger.id, sourceHandle: 'out', target: condition.id, targetHandle: 'in', order: 0 },
      { id: generateWorkflowId('edge'), source: condition.id, sourceHandle: 'true', target: reply.id, targetHandle: 'in', order: 0 },
      { id: generateWorkflowId('edge'), source: condition.id, sourceHandle: 'false', target: ai.id, targetHandle: 'in', order: 1 },
    ],
  };
}

export function isWorkflowGraph(value: unknown): value is WorkflowGraph {
  if (!value || typeof value !== 'object') return false;

  const graph = value as Partial<WorkflowGraph>;
  return (
    graph.schemaVersion === 'workflow-graph/v1' &&
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.edges)
  );
}

export function normalizeWorkflowGraph(graph: WorkflowGraph): WorkflowGraph {
  return {
    schemaVersion: 'workflow-graph/v1',
    viewport: graph.viewport || defaultViewport,
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
  };
}

export function updateWorkflowNodeData(
  graph: WorkflowGraph,
  nodeId: string,
  patch: Record<string, unknown>
): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, ...patch } }
        : node
    ),
  };
}

export function updateWorkflowNodePosition(
  graph: WorkflowGraph,
  nodeId: string,
  position: WorkflowPosition
): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
  };
}

export function removeWorkflowNode(graph: WorkflowGraph, nodeId: string): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    edges: graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
  };
}

export function upsertWorkflowEdge(graph: WorkflowGraph, edge: WorkflowEdge): WorkflowGraph {
  const duplicateIndex = graph.edges.findIndex(
    (existing) =>
      existing.source === edge.source &&
      existing.sourceHandle === edge.sourceHandle &&
      existing.target === edge.target
  );

  if (duplicateIndex >= 0) {
    return graph;
  }

  return {
    ...graph,
    edges: [...graph.edges, { ...edge, order: graph.edges.length }],
  };
}

export function removeWorkflowEdge(graph: WorkflowGraph, edgeId: string): WorkflowGraph {
  return {
    ...graph,
    edges: graph.edges.filter((edge) => edge.id !== edgeId),
  };
}

export function validateWorkflowGraph(graph: WorkflowGraph | null): WorkflowValidationResult {
  if (!graph) {
    return {
      isValid: false,
      errors: ['目前選擇的邏輯模板不是新版節點流程格式'],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const triggerNodes = graph.nodes.filter((node) => getWorkflowNodeKind(node.type) === 'trigger');

  if (triggerNodes.length === 0) {
    errors.push('至少需要一個觸發節點');
  }

  graph.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source)) errors.push(`連線 ${edge.id} 的起點不存在`);
    if (!nodeIds.has(edge.target)) errors.push(`連線 ${edge.id} 的終點不存在`);
    if (edge.source === edge.target) errors.push('不允許節點連到自己');
  });

  graph.nodes.forEach((node) => {
    const incomingCount = graph.edges.filter((edge) => edge.target === node.id).length;
    const outgoingCount = graph.edges.filter((edge) => edge.source === node.id).length;
    const kind = getWorkflowNodeKind(node.type);

    if (kind !== 'trigger' && incomingCount === 0) {
      warnings.push(`${getWorkflowNodeDefinition(node.type).label} 沒有輸入連線`);
    }

    if (kind === 'trigger' && outgoingCount === 0) {
      warnings.push(`${getWorkflowNodeDefinition(node.type).label} 沒有接到任何動作`);
    }

    if (node.type === 'action.replyText' && !String(node.data.text || '').trim()) {
      warnings.push('回覆文字節點尚未設定文字內容');
    }

    if (node.type === 'action.replyFlex' && !String(node.data.flexMessageId || '').trim()) {
      warnings.push('回覆 Flex 節點尚未選擇 Flex Message 範本');
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function getDefaultNodeData(type: WorkflowNodeType): Record<string, unknown> {
  switch (type) {
    case 'trigger.message':
      return { matchMode: 'any', pattern: '', caseSensitive: false };
    case 'trigger.postback':
      return { data: '' };
    case 'condition.keyword':
      return { keywords: '', matchMode: 'contains', caseSensitive: false };
    case 'action.replyText':
      return { text: '請輸入回覆內容' };
    case 'action.replyImage':
      return { originalContentUrl: '', previewImageUrl: '' };
    case 'action.replySticker':
      return { packageId: '1', stickerId: '1' };
    case 'action.replyFlex':
      return { flexMessageId: '', flexMessageName: '', altText: 'Flex 訊息' };
    case 'action.aiTakeover':
      return { note: '此節點會要求 webhook 排程 AI 接管' };
    case 'action.setVariable':
      return { variableName: 'last_message', variableValue: '{{message.text}}' };
    case 'action.wait':
      return { duration: 1, unit: 'seconds' };
    case 'action.webhook':
      return { method: 'POST', url: '', headersText: '', body: '' };
    default:
      return {};
  }
}
