import type { WorkflowGraph } from '@/features/visual-editor/types/workflow';

export function generateWorkflowCode(graph: WorkflowGraph | null): string {
  if (!graph) {
    return '# 不支援的舊版邏輯模板';
  }

  return `# LINE Bot Workflow Graph
# 此程式碼為新版節點流程的可讀摘要；實際執行由後端 LogicEngineService 依 graph traversal 完成。

WORKFLOW_GRAPH = ${JSON.stringify(graph, null, 2)}
`;
}
