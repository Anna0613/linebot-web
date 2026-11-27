import type { WorkflowGraph } from "../types/workflow";

export interface SimMessage {
  type: "user" | "bot" | "system";
  content: string;
  flexId?: string;
}

export function simulateGraph(graph: WorkflowGraph, userMessage: string, flexMessages: {id:string;name:string}[]): SimMessage[] {
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
      const asset = flexMessages.find(message => message.id === node.data.flexMessageId);
      const name = asset?.name || node.data.flexMessageName;
      result.push({ type: 'bot', flexId: asset?.id, content: `Flex 訊息：${String(name || '未選擇範本')}` });
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
