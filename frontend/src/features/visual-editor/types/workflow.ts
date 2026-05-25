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

export interface WorkflowOperationResult {
  isValid: boolean;
  reason?: string;
  suggestions?: string[];
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

const WORKFLOW_NODE_TYPE_SET = new Set<WorkflowNodeType>(
  WORKFLOW_NODE_DEFINITIONS.map((definition) => definition.type)
);

const defaultViewport: WorkflowViewport = { x: 40, y: 30, zoom: 1 };

export function generateWorkflowId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isKnownWorkflowNodeType(type: string): type is WorkflowNodeType {
  return WORKFLOW_NODE_TYPE_SET.has(type as WorkflowNodeType);
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

export function canAddWorkflowNode(graph: WorkflowGraph, type: WorkflowNodeType): WorkflowOperationResult {
  if (!isKnownWorkflowNodeType(type)) {
    return {
      isValid: false,
      reason: '無法辨識此節點類型',
      suggestions: ['請重新整理頁面後再試一次'],
    };
  }

  const kind = getWorkflowNodeKind(type);
  const triggerCount = graph.nodes.filter((node) => getWorkflowNodeKind(node.type) === 'trigger').length;

  if (kind === 'trigger' && triggerCount > 0) {
    return {
      isValid: false,
      reason: '一個邏輯模板只能有一個觸發節點',
      suggestions: ['請建立另一個邏輯模板處理其他觸發事件'],
    };
  }

  if (kind !== 'trigger' && triggerCount === 0) {
    return {
      isValid: false,
      reason: '請先放入一個觸發節點，再新增邏輯或動作節點',
      suggestions: ['例如先新增「收到文字訊息」或「加入好友」'],
    };
  }

  return { isValid: true };
}

function graphHasPath(graph: WorkflowGraph, fromNodeId: string, toNodeId: string): boolean {
  const visited = new Set<string>();
  const queue = [fromNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toNodeId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    graph.edges
      .filter((edge) => edge.source === current)
      .forEach((edge) => {
        if (!visited.has(edge.target)) queue.push(edge.target);
      });
  }

  return false;
}

export function canConnectWorkflowNodes(
  graph: WorkflowGraph,
  sourceId: string,
  sourceHandle: string,
  targetId: string
): WorkflowOperationResult {
  const source = graph.nodes.find((node) => node.id === sourceId);
  const target = graph.nodes.find((node) => node.id === targetId);

  if (!source || !target) {
    return {
      isValid: false,
      reason: '連線的起點或終點不存在',
    };
  }

  if (source.id === target.id) {
    return {
      isValid: false,
      reason: '不允許節點連到自己',
    };
  }

  if (getWorkflowNodeKind(target.type) === 'trigger') {
    return {
      isValid: false,
      reason: '觸發節點只能作為流程起點，不能被其他節點連入',
    };
  }

  const sourceOutputs = getWorkflowOutputHandles(source.type);
  if (!sourceOutputs.some((handle) => handle.id === sourceHandle)) {
    return {
      isValid: false,
      reason: `${getWorkflowNodeDefinition(source.type).label} 沒有可用的「${sourceHandle}」輸出`,
    };
  }

  if (getWorkflowInputHandles(target.type).length === 0) {
    return {
      isValid: false,
      reason: `${getWorkflowNodeDefinition(target.type).label} 不能接收輸入連線`,
    };
  }

  if (graph.edges.some(
    (edge) =>
      edge.source === sourceId &&
      edge.sourceHandle === sourceHandle &&
      edge.target === targetId
  )) {
    return {
      isValid: false,
      reason: '此連線已經存在',
    };
  }

  const existingOutgoing = graph.edges.find(
    (edge) => edge.source === sourceId && edge.sourceHandle === sourceHandle
  );
  if (existingOutgoing) {
    return {
      isValid: false,
      reason: '同一個輸出端只能連到一個下一步',
      suggestions: ['條件節點請分別使用「符合」與「不符合」輸出'],
    };
  }

  const existingIncoming = graph.edges.find((edge) => edge.target === targetId);
  if (existingIncoming) {
    return {
      isValid: false,
      reason: '同一個節點只能有一條輸入連線',
      suggestions: ['請新增另一個節點，或先刪除原本的輸入連線'],
    };
  }

  if (graphHasPath(graph, targetId, sourceId)) {
    return {
      isValid: false,
      reason: '此連線會形成循環流程',
      suggestions: ['請把流程設計成由觸發節點往右依序前進'],
    };
  }

  return { isValid: true };
}

export function upsertWorkflowEdge(graph: WorkflowGraph, edge: WorkflowEdge): WorkflowGraph {
  const connectionCheck = canConnectWorkflowNodes(graph, edge.source, edge.sourceHandle, edge.target);
  if (!connectionCheck.isValid) {
    return graph;
  }

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
  const nodeIds = new Set<string>();
  const duplicateNodeIds = new Set<string>();

  graph.nodes.forEach((node) => {
    if (nodeIds.has(node.id)) duplicateNodeIds.add(node.id);
    nodeIds.add(node.id);
    if (!isKnownWorkflowNodeType(node.type)) {
      errors.push(`節點 ${node.id} 使用了無法辨識的類型 ${node.type}`);
    }
  });

  duplicateNodeIds.forEach((nodeId) => {
    errors.push(`節點 ID 重複：${nodeId}`);
  });

  const triggerNodes = graph.nodes.filter((node) => getWorkflowNodeKind(node.type) === 'trigger');

  if (triggerNodes.length === 0) {
    errors.push('至少需要一個觸發節點');
  } else if (triggerNodes.length > 1) {
    errors.push('一個邏輯模板只能有一個觸發節點，請拆成多個邏輯模板');
  }

  graph.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source)) errors.push(`連線 ${edge.id} 的起點不存在`);
    if (!nodeIds.has(edge.target)) errors.push(`連線 ${edge.id} 的終點不存在`);
    if (edge.source === edge.target) errors.push('不允許節點連到自己');

    const source = graph.nodes.find((node) => node.id === edge.source);
    const target = graph.nodes.find((node) => node.id === edge.target);
    if (!source || !target) return;

    const targetHandles = getWorkflowInputHandles(target.type).map((handle) => handle.id);
    if (!targetHandles.includes(edge.targetHandle || 'in')) {
      errors.push(`連線 ${edge.id} 的終點輸入端不存在`);
    }

    const graphWithoutCurrentEdge = {
      ...graph,
      edges: graph.edges.filter((candidate) => candidate.id !== edge.id),
    };
    const connectionCheck = canConnectWorkflowNodes(
      graphWithoutCurrentEdge,
      edge.source,
      edge.sourceHandle,
      edge.target
    );
    if (!connectionCheck.isValid) {
      errors.push(`連線 ${edge.id} 無效：${connectionCheck.reason}`);
    }
  });

  const reachableNodeIds = new Set<string>();
  const reachabilityQueue = triggerNodes.map((node) => node.id);
  while (reachabilityQueue.length > 0) {
    const nodeId = reachabilityQueue.shift()!;
    if (reachableNodeIds.has(nodeId)) continue;
    reachableNodeIds.add(nodeId);
    graph.edges
      .filter((edge) => edge.source === nodeId)
      .forEach((edge) => reachabilityQueue.push(edge.target));
  }

  graph.nodes.forEach((node) => {
    const incomingCount = graph.edges.filter((edge) => edge.target === node.id).length;
    const outgoingEdges = graph.edges.filter((edge) => edge.source === node.id);
    const outgoingCount = outgoingEdges.length;
    const kind = getWorkflowNodeKind(node.type);

    if (kind === 'trigger' && incomingCount > 0) {
      errors.push(`${getWorkflowNodeDefinition(node.type).label} 是觸發節點，不能有輸入連線`);
    }

    if (kind !== 'trigger' && incomingCount === 0) {
      errors.push(`${getWorkflowNodeDefinition(node.type).label} 沒有輸入連線`);
    }

    if (kind !== 'trigger' && incomingCount > 1) {
      errors.push(`${getWorkflowNodeDefinition(node.type).label} 只能有一條輸入連線`);
    }

    if (kind !== 'trigger' && triggerNodes.length > 0 && !reachableNodeIds.has(node.id)) {
      errors.push(`${getWorkflowNodeDefinition(node.type).label} 沒有連到觸發節點形成的流程`);
    }

    if (kind === 'trigger' && outgoingCount === 0) {
      warnings.push(`${getWorkflowNodeDefinition(node.type).label} 沒有接到任何動作`);
    }

    if (node.type === 'condition.keyword') {
      const handles = new Set(outgoingEdges.map((edge) => edge.sourceHandle));
      if (!handles.has('true')) warnings.push('條件分支尚未連接「符合」路徑');
      if (!handles.has('false')) warnings.push('條件分支尚未連接「不符合」路徑');
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
