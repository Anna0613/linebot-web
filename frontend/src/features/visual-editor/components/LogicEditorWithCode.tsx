import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import WorkflowBuilder from './workflow/WorkflowBuilder';
import { WorkflowGraph } from '@/features/visual-editor/types/workflow';

interface LogicEditorWithCodeProps {
  selectedLogicTemplateId: string;
  currentLogicTemplateName: string;
  workflowGraph: WorkflowGraph | null;
  isUnsupportedTemplate?: boolean;
  onWorkflowGraphChange: (graph: WorkflowGraph) => void;
}

const LogicEditorWithCode: React.FC<LogicEditorWithCodeProps> = ({
  currentLogicTemplateName,
  workflowGraph,
  isUnsupportedTemplate = false,
  onWorkflowGraphChange,
}) => {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      {isUnsupportedTemplate || !workflowGraph ? (
        <UnsupportedTemplateState templateName={currentLogicTemplateName} />
      ) : (
        <WorkflowBuilder graph={workflowGraph} onChange={onWorkflowGraphChange} />
      )}
    </div>
  );
};

const UnsupportedTemplateState: React.FC<{ templateName?: string }> = ({ templateName }) => (
  <div className="flex h-full items-center justify-center p-6">
    <div className="app-panel-strong max-w-xl p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold text-slate-950">不支援的舊版模板</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {templateName ? `「${templateName}」` : '目前模板'}不是新版節點流程格式。依照目前策略，舊模板不會自動轉換，請新增一個新版邏輯模板重新建立流程。
      </p>
      <Button className="app-secondary-button mt-5" disabled>
        舊模板已停用編輯與儲存
      </Button>
    </div>
  </div>
);

export default LogicEditorWithCode;
