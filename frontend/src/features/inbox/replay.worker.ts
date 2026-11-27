import { simulateGraph } from "../visual-editor/utils/simulateGraph";
import type { WorkflowGraph } from "../visual-editor/types/workflow";

self.onmessage = (
  event: MessageEvent<{
    graph: WorkflowGraph;
    body: string;
    assets: { id: string; name: string }[];
  }>
) => {
  const { graph, body, assets } = event.data;
  self.postMessage(simulateGraph(graph, body, assets));
};
