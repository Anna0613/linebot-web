import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DragDropProvider from './DragDropProvider';
import Workspace from './Workspace';
import SaveStatusIndicator from './SaveStatusIndicator';
import { SaveStatus } from '@/features/visual-editor/types/saveStatus';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { useSelectedBot } from '@/features/bots/context/SelectedBotContext';
import { UnifiedBlock } from '@/features/visual-editor/types/block';
import {
  WorkflowGraph,
  createStarterWorkflowGraph,
  isWorkflowGraph,
  normalizeWorkflowGraph,
  validateWorkflowGraph,
} from '@/features/visual-editor/types/workflow';
import VisualEditorApi, { FlexMessage } from '@/features/visual-editor/api/visualEditorApi';
import { generateWorkflowCode } from '@/features/visual-editor/utils/workflowCodeGenerator';
import { validateFlexMessageBlocks } from '@/features/visual-editor/utils/flexMessageBuilder';
import { VisualEditorProvider } from '@/features/visual-editor/context/VisualEditorContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// 專案資料介面（未使用,已移除）
type VisualEditorRouteState = {
  activeTab?: string;
  selectedBotId?: string | null;
  returnTo?: string;
  returnLabel?: string;
};

type PendingUnsavedAction =
  | { type: 'back' }
  | { type: 'switchBot'; botId: string };

export const VisualBotEditor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialRouteState = location.state as VisualEditorRouteState | null;
  const initialActiveTab = initialRouteState?.activeTab || 'basic';
  const { selectedBotId: globalSelectedBotId, selectBot, refreshBots } = useSelectedBot();
  const initialSelectedBotId = initialRouteState?.selectedBotId || globalSelectedBotId || '';
  const routeSelectedBotIdRef = useRef(initialRouteState?.selectedBotId || '');
  const routeSelectionAppliedRef = useRef(false);
  const returnTo = initialRouteState?.returnTo || '/bots/management';
  const returnLabel = initialRouteState?.returnLabel || '返回互動紀錄';
  const [logicGraph, setLogicGraph] = useState<WorkflowGraph | null>(null);
  const [flexBlocks, setFlexBlocks] = useState<UnifiedBlock[]>([]);
  const [projectVersion, _setProjectVersion] = useState<string>('2.0'); // 新版本使用統一積木系統
  const [selectedBotId, setSelectedBotId] = useState<string>(initialSelectedBotId);
  const [selectedLogicTemplateId, setSelectedLogicTemplateId] = useState<string>('');
  const [selectedFlexMessageId, setSelectedFlexMessageId] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [currentLogicTemplateName, setCurrentLogicTemplateName] = useState<string>('');
  const [currentFlexMessageName, setCurrentFlexMessageName] = useState<string>('');
  const [isUnsupportedLogicTemplate, setIsUnsupportedLogicTemplate] = useState(false);

  // 延遲儲存相關狀態
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(SaveStatus.SAVED);
  const [lastSavedTime, setLastSavedTime] = useState<Date | undefined>();
  const [saveError, setSaveError] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<PendingUnsavedAction | null>(null);

  // 標記為有未儲存變更 - 使用防抖優化
  const markAsChanged = useCallback(() => {
    // 檢查是否正在儲存中，避免儲存期間觸發狀態變更
    if (saveStatus !== SaveStatus.PENDING && saveStatus !== SaveStatus.SAVING) {
      setSaveStatus(SaveStatus.PENDING);
      setHasUnsavedChanges(true);
      setSaveError('');
    }
  }, [saveStatus]);

  // 防抖版本的標記變更函數 - 加強版本，增加儲存狀態檢查
  const debouncedMarkAsChanged = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // 再次檢查儲存狀態，確保不會在儲存完成後立即觸發
          if (saveStatus !== SaveStatus.SAVING) {
            markAsChanged();
          }
        }, 500); // 增加到 500ms 防抖延遲，給狀態更新更多時間
      };
    },
    [markAsChanged, saveStatus]
  );

  // 處理返回上一頁
  const handleGoBack = () => {
    const goBack = () => navigate(returnTo);

    // 如果有未儲存的變更，先嘗試儲存
    if (hasUnsavedChanges) {
      setPendingUnsavedAction({ type: 'back' });
    } else {
      goBack();
    }
  };

  // 監聽積木變更，標記為未儲存
  const isInitialLoadRef = useRef(true);
  const previousBlocksRef = useRef<{ logicGraph: WorkflowGraph | null; flexBlocks: UnifiedBlock[] }>({ logicGraph: null, flexBlocks: [] });
  const isSavingRef = useRef(false);
  const confirmingUnsavedActionRef = useRef(false);

  // Auto-save: 持有最新資料，避免 async callback 中閉包過期
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCreatingFlexDraftRef = useRef(false);
  const latestAutoSaveDataRef = useRef<{
    logicTemplateId: string;
    flexMessageId: string;
    logicGraph: WorkflowGraph | null;
    flexBlocks: UnifiedBlock[];
  }>({ logicTemplateId: '', flexMessageId: '', logicGraph: null, flexBlocks: [] });

  const applyBotSelection = useCallback((botId: string) => {
    setSelectedBotId(botId);
    // 清空邏輯模板和 FlexMessage 選擇
    setSelectedLogicTemplateId('');
    setSelectedFlexMessageId('');
    setCurrentLogicTemplateName('');
    setCurrentFlexMessageName('');
    setIsUnsupportedLogicTemplate(false);
    setSaveStatus(SaveStatus.SAVED);
    setLastSavedTime(undefined);
    setSaveError('');
    setHasUnsavedChanges(false);
    
    if (botId && VisualEditorApi.isValidBotId(botId)) {
      // 清空當前積木，等待用戶選擇邏輯模板和 FlexMessage
      setLogicGraph(null);
      setFlexBlocks([]);
    } else {
      // 清空積木
      setLogicGraph(null);
      setFlexBlocks([]);
    }
  }, []);

  // 處理 Bot 選擇變更
  const handleBotSelect = useCallback(async (botId: string) => {
    selectBot(botId);
    applyBotSelection(botId);
  }, [applyBotSelection, selectBot]);

  useEffect(() => {
    if (routeSelectionAppliedRef.current) return;

    routeSelectionAppliedRef.current = true;
    const routeSelectedBotId = routeSelectedBotIdRef.current;
    if (routeSelectedBotId && routeSelectedBotId !== globalSelectedBotId) {
      selectBot(routeSelectedBotId);
    }
  }, [globalSelectedBotId, selectBot]);

  useEffect(() => {
    if (!globalSelectedBotId || globalSelectedBotId === selectedBotId) return;

    if (hasUnsavedChanges) {
      setPendingUnsavedAction({ type: 'switchBot', botId: globalSelectedBotId });
      return;
    }

    void handleBotSelect(globalSelectedBotId);
  }, [
    globalSelectedBotId,
    selectedBotId,
    hasUnsavedChanges,
    handleBotSelect,
    selectBot,
  ]);

  // 處理邏輯模板選擇變更
  const handleLogicTemplateSelect = async (templateId: string) => {
    setSelectedLogicTemplateId(templateId);
    
    if (templateId) {
      setIsLoadingData(true);
      try {
        const template = await VisualEditorApi.getLogicTemplate(templateId, false); // 強制跳過快取

        const rawLogic = template.logic_blocks;
        const isSupportedGraph = isWorkflowGraph(rawLogic);
        const graph = isSupportedGraph ? normalizeWorkflowGraph(rawLogic) : null;

        setLogicGraph(graph);
        setIsUnsupportedLogicTemplate(!isSupportedGraph);
        setCurrentLogicTemplateName(template.name);
        
        console.log(`📦 載入邏輯模板 "${template.name}"`, {
          supported: isSupportedGraph,
          nodes: graph?.nodes.length || 0,
          edges: graph?.edges.length || 0,
          templateId: templateId
        });
        
        // 重置儲存狀態為已儲存（剛載入的數據）
        setSaveStatus(SaveStatus.SAVED);
        setHasUnsavedChanges(false);
        setSaveError('');
        setLastSavedTime(new Date(template.updated_at));
        
        // 同步更新參考值，避免載入後被誤判為變更
        previousBlocksRef.current = {
          logicGraph: graph,
          flexBlocks: memoizedFlexBlocks
        };
        
        console.log(`已載入邏輯模板 ${template.name} 的數據`);
      } catch (error) {
        console.error("Error occurred:", error);
        setLogicGraph(null);
        setIsUnsupportedLogicTemplate(false);
        setCurrentLogicTemplateName('');
        setSaveStatus(SaveStatus.ERROR);
        setSaveError('載入邏輯模板失敗');
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setLogicGraph(null);
      setIsUnsupportedLogicTemplate(false);
      setCurrentLogicTemplateName('');
      setSaveStatus(SaveStatus.SAVED);
      setHasUnsavedChanges(false);
      setSaveError('');
    }
  };

  // 處理 FlexMessage 選擇變更
  const handleFlexMessageSelect = async (messageId: string) => {
    setSelectedFlexMessageId(messageId);
    
    if (messageId) {
      setIsLoadingData(true);
      try {
        const messages = await VisualEditorApi.getUserFlexMessages(false); // 強制跳過快取
        const message = messages.find(m => m.id === messageId);
        
        if (message) {
          let blocks: UnifiedBlock[] = [];

          console.log('🔍 載入 FlexMessage 詳細資訊:', {
            id: message.id,
            name: message.name,
            contentType: typeof message.content,
            content: message.content,
            hasBlocks: !!(message as FlexMessage & { blocks?: unknown }).blocks,
            designBlocks: message.design_blocks
          });

          // 優先使用後端提供的 design_blocks（編輯器 blocks）
          const designBlocks = message.design_blocks;
          if (Array.isArray(designBlocks)) {
            blocks = designBlocks;
            console.log('✅ 使用 design_blocks:', blocks.length, '個積木');
          } else {
            try {
              // 解析 content（如果它是 JSON 字符串）
              let parsedContent: unknown = message.content;
              if (typeof message.content === 'string') {
                parsedContent = JSON.parse(message.content);
                console.log('🔄 解析 JSON 字串成功:', parsedContent);
              }

              const contentWithBlocks = parsedContent as { blocks?: UnifiedBlock[] };
              if (parsedContent && Array.isArray(contentWithBlocks.blocks)) {
                blocks = contentWithBlocks.blocks;
                console.log('✅ 使用 parsedContent.blocks:', blocks.length, '個積木');
              } else if (Array.isArray(parsedContent)) {
                blocks = parsedContent as UnifiedBlock[];
                console.log('✅ 使用 parsedContent 陣列:', blocks.length, '個積木');
              } else {
                const messageWithBlocks = message as FlexMessage & { blocks?: UnifiedBlock[] };
                if (Array.isArray(messageWithBlocks.blocks)) {
                  blocks = messageWithBlocks.blocks;
                  console.log('✅ 使用 message.blocks:', blocks.length, '個積木');
                }
              }
            } catch (_parseError) {
              console.log('❌ JSON 解析失敗:', _parseError);
              // 嘗試備援路徑
              const messageWithBlocks = message as FlexMessage & { blocks?: UnifiedBlock[] };
              if (Array.isArray(messageWithBlocks.blocks)) {
                blocks = messageWithBlocks.blocks;
                console.log('✅ 使用備用 message.blocks:', blocks.length, '個積木');
              }
            }
          }

          console.log('🎯 最終設置的 flexBlocks:', blocks);
          setFlexBlocks(blocks);
          setCurrentFlexMessageName(message.name);
          
          // 重置儲存狀態為已儲存（剛載入的數據）
          setSaveStatus(SaveStatus.SAVED);
          setHasUnsavedChanges(false);
          setSaveError('');
          setLastSavedTime(new Date(message.updated_at));
          
          // 同步更新參考值，避免載入後被誤判為變更
          previousBlocksRef.current = { 
            logicGraph: memoizedLogicGraph, 
            flexBlocks: blocks 
          };
        } else {
          setFlexBlocks([]);
          setCurrentFlexMessageName(message?.name || '');
          setSaveStatus(SaveStatus.SAVED);
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error("Error occurred:", error);
        setFlexBlocks([]);
        setCurrentFlexMessageName('');
        setSaveStatus(SaveStatus.ERROR);
        setSaveError('載入 FlexMessage 失敗');
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setFlexBlocks([]);
      setCurrentFlexMessageName('');
      setSaveStatus(SaveStatus.SAVED);
      setHasUnsavedChanges(false);
      setSaveError('');
    }
  };

  // 創建新邏輯模板
  const handleLogicTemplateCreate = async (name: string) => {
    if (!selectedBotId) {
      throw new Error('請先選擇一個 Bot');
    }

    try {
      const template = await VisualEditorApi.createLogicTemplate(selectedBotId, {
        name,
        description: `由視覺化編輯器創建的邏輯模板`,
        logic_blocks: createStarterWorkflowGraph(),
        is_active: 'false'
      });
      
      // 自動選擇新創建的邏輯模板
      await handleLogicTemplateSelect(template.id);
      console.log('邏輯模板創建成功:', template);
    } catch (_error) {
      console.error("Error occurred:", _error);
      throw _error;
    }
  };

  // 創建新 FlexMessage
  const handleFlexMessageCreate = async (name: string) => {
    try {
      const message = await VisualEditorApi.createFlexMessage({
        name,
        content: { blocks: [] },
        // 同步保存編輯器 blocks，供重新載入時還原預覽
        design_blocks: []
      });
      
      // 自動選擇新創建的 FlexMessage
      await handleFlexMessageSelect(message.id);
      console.log('FlexMessage 創建成功:', message);
    } catch (_error) {
      console.error("Error occurred:", _error);
      throw _error;
    }
  };

  // 刪除邏輯模板
  const handleLogicTemplateDelete = async (templateId: string) => {
    if (!selectedBotId) {
      throw new Error('請先選擇一個 Bot');
    }
    try {
      await VisualEditorApi.deleteLogicTemplate(templateId, selectedBotId);
      // 若刪除的是目前選取的模板，清空狀態
      if (selectedLogicTemplateId === templateId) {
        setSelectedLogicTemplateId('');
        setCurrentLogicTemplateName('');
        setLogicGraph(null);
        setIsUnsupportedLogicTemplate(false);
      }
      console.log('邏輯模板刪除成功:', templateId);
    } catch (_error) {
      console.error("Error occurred:", _error);
      throw _error;
    }
  };

  // 刪除 FlexMessage
  const handleFlexMessageDelete = async (messageId: string) => {
    try {
      await VisualEditorApi.deleteFlexMessage(messageId);
      // 若刪除的是目前選取的訊息，清空狀態
      if (selectedFlexMessageId === messageId) {
        setSelectedFlexMessageId('');
        setCurrentFlexMessageName('');
        setFlexBlocks([]);
      }
      console.log('FlexMessage 刪除成功:', messageId);
    } catch (_error) {
      console.error("Error occurred:", _error);
      throw _error;
    }
  };

  // 儲存邏輯模板
  const handleLogicTemplateSave = async (templateId: string, data: { workflowGraph: WorkflowGraph, generatedCode: string }) => {
    try {
      const validation = validateWorkflowGraph(data.workflowGraph);
      if (!validation.isValid) {
        const message = `邏輯結構無法儲存：${validation.errors[0]}`;
        setSaveStatus(SaveStatus.ERROR);
        setSaveError(message);
        setHasUnsavedChanges(true);
        throw new Error(message);
      }

      // 設置儲存中狀態，並鎖定儲存操作
      isSavingRef.current = true;
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');

      await VisualEditorApi.updateLogicTemplate(templateId, {
        logic_blocks: data.workflowGraph,
        generated_code: data.generatedCode
      });
      
      // 原子性狀態更新：同時設置所有狀態避免競爭
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      
      // 更新參考值，避免後續誤判
      previousBlocksRef.current = { 
        logicGraph: data.workflowGraph, 
        flexBlocks: memoizedFlexBlocks 
      };
      
      console.log(`邏輯模板 ${templateId} 儲存成功`);
    } catch (error) {
      console.error("Error occurred:", error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '儲存失敗');
      throw error;
    } finally {
      // 確保儲存鎖定狀態被釋放
      isSavingRef.current = false;
    }
  };

  // 儲存 FlexMessage
  const handleFlexMessageSave = async (messageId: string, data: { flexBlocks: UnifiedBlock[] }) => {
    try {
      const validation = validateFlexMessageBlocks(data.flexBlocks);
      if (!validation.isValid) {
        const message = `Flex Message 結構無法儲存：${validation.errors[0]}`;
        setSaveStatus(SaveStatus.ERROR);
        setSaveError(message);
        setHasUnsavedChanges(true);
        throw new Error(message);
      }

      // 設置儲存中狀態，並鎖定儲存操作
      isSavingRef.current = true;
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');

      await VisualEditorApi.updateFlexMessage(messageId, {
        content: { blocks: data.flexBlocks },
        // 併行保存設計器 blocks，避免後端只保留編譯後的 bubble 而導致重載後無法還原預覽
        design_blocks: data.flexBlocks
      });
      
      // 原子性狀態更新：同時設置所有狀態避免競爭
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      
      // 更新參考值，避免後續誤判
      previousBlocksRef.current = { 
        logicGraph: memoizedLogicGraph, 
        flexBlocks: data.flexBlocks 
      };
      
      console.log(`FlexMessage ${messageId} 儲存成功`);
    } catch (error) {
      console.error("Error occurred:", error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '儲存失敗');
      throw error;
    } finally {
      // 確保儲存鎖定狀態被釋放
      isSavingRef.current = false;
    }
  };

  const handleAutoCreateFlexMessage = async (data: { flexBlocks: UnifiedBlock[] }): Promise<void> => {
    if (isCreatingFlexDraftRef.current || data.flexBlocks.length === 0) return;

    try {
      const validation = validateFlexMessageBlocks(data.flexBlocks);
      if (!validation.isValid) {
        const message = `Flex Message 結構無法儲存：${validation.errors[0]}`;
        setSaveStatus(SaveStatus.ERROR);
        setSaveError(message);
        setHasUnsavedChanges(true);
        throw new Error(message);
      }

      isCreatingFlexDraftRef.current = true;
      isSavingRef.current = true;
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');

      const timestamp = new Date().toLocaleString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const message = await VisualEditorApi.createFlexMessage({
        name: `未命名 Flex 訊息 ${timestamp}`,
        content: { blocks: data.flexBlocks },
        design_blocks: data.flexBlocks,
      });

      setSelectedFlexMessageId(message.id);
      setCurrentFlexMessageName(message.name);
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date(message.updated_at || Date.now()));
      setHasUnsavedChanges(false);

      previousBlocksRef.current = {
        logicGraph: memoizedLogicGraph,
        flexBlocks: data.flexBlocks,
      };

      console.log(`FlexMessage 草稿 ${message.id} 自動建立並儲存成功`);
    } catch (error) {
      console.error('Auto-create flex message failed:', error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '自動建立 FlexMessage 失敗');
      throw error;
    } finally {
      isCreatingFlexDraftRef.current = false;
      isSavingRef.current = false;
    }
  };

  // （移除未使用的函式：handleSaveToBot、handleImportProject）

  // 記憶化積木數據以減少不必要的重新渲染
  const memoizedLogicGraph = useMemo(() => logicGraph, [logicGraph]);
  const memoizedFlexBlocks = useMemo(() => flexBlocks, [flexBlocks]);

  // 同步最新資料到 ref，供 auto-save 使用（每次 render 後執行，確保 timer callback 拿到最新值）
  useEffect(() => {
    latestAutoSaveDataRef.current = {
      logicTemplateId: selectedLogicTemplateId,
      flexMessageId: selectedFlexMessageId,
      logicGraph: memoizedLogicGraph,
      flexBlocks: memoizedFlexBlocks,
    };
  });

  // ─── Auto-save（業界標準 Debounce 策略）──────────────────────────────────
  // 當 saveStatus 變為 PENDING 時啟動計時器，1.5s 後若無新變更則自動儲存。
  // 使用 latestAutoSaveDataRef 確保儲存時使用最新資料，避免 stale closure。
  useEffect(() => {
    if (saveStatus !== SaveStatus.PENDING) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      autoSaveTimerRef.current = null;
      const { logicTemplateId, flexMessageId, logicGraph, flexBlocks } =
        latestAutoSaveDataRef.current;

      const logicValidation = logicTemplateId && logicGraph
        ? validateWorkflowGraph(logicGraph)
        : null;
      const flexValidation = (flexMessageId || flexBlocks.length > 0)
        ? validateFlexMessageBlocks(flexBlocks)
        : null;

      if (logicValidation && !logicValidation.isValid) {
        setSaveStatus(SaveStatus.ERROR);
        setSaveError(`邏輯結構無法儲存：${logicValidation.errors[0]}`);
        setHasUnsavedChanges(true);
        return;
      }

      if (flexValidation && !flexValidation.isValid) {
        setSaveStatus(SaveStatus.ERROR);
        setSaveError(`Flex Message 結構無法儲存：${flexValidation.errors[0]}`);
        setHasUnsavedChanges(true);
        return;
      }

      if (logicTemplateId && logicGraph) {
        try {
          const generatedCode = generateWorkflowCode(logicGraph);
          await handleLogicTemplateSave(logicTemplateId, { workflowGraph: logicGraph, generatedCode });
        } catch (err) {
          console.error('Auto-save logic template failed:', err);
        }
      }

      if (flexMessageId) {
        try {
          await handleFlexMessageSave(flexMessageId, { flexBlocks });
        } catch (err) {
          console.error('Auto-save flex message failed:', err);
        }
      } else if (flexBlocks.length > 0) {
        try {
          await handleAutoCreateFlexMessage({ flexBlocks });
        } catch (err) {
          console.error('Auto-create flex message failed:', err);
        }
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus]);
  // ─────────────────────────────────────────────────────────────────────────

  // 監聽積木變更的 useEffect（增強版本，精確檢測變更）
  useEffect(() => {
    // 初次載入時不觸發變更檢測
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      previousBlocksRef.current = { 
        logicGraph: memoizedLogicGraph, 
        flexBlocks: memoizedFlexBlocks 
      };
      return;
    }
    
    // 如果正在載入數據或正在儲存，不觸發變更檢測
    if (isLoadingData || isSavingRef.current || saveStatus === SaveStatus.SAVING) {
      return;
    }
    
    // 比較實際的積木內容是否有變化
    // 注意：排除 viewport（畫布平移/縮放）—— 移動畫布不屬於「內容變更」，不應觸發 auto-save
    const stripViewport = (g: typeof memoizedLogicGraph) =>
      g ? { schemaVersion: g.schemaVersion, nodes: g.nodes, edges: g.edges } : null;
    const logicBlocksChanged =
      JSON.stringify(stripViewport(memoizedLogicGraph)) !==
      JSON.stringify(stripViewport(previousBlocksRef.current.logicGraph));
    const flexBlocksChanged = JSON.stringify(memoizedFlexBlocks) !== JSON.stringify(previousBlocksRef.current.flexBlocks);
    
    // 只有當積木實際發生變更時才標記
    if (logicBlocksChanged || flexBlocksChanged) {
      // 更新參考值
      previousBlocksRef.current = { 
        logicGraph: memoizedLogicGraph, 
        flexBlocks: memoizedFlexBlocks 
      };
      
      debouncedMarkAsChanged();
    }
  }, [memoizedLogicGraph, memoizedFlexBlocks, isLoadingData, debouncedMarkAsChanged, saveStatus]);

  // 初始化組件
  useEffect(() => {
    // 組件初始化時為空狀態，等待用戶選擇 Bot
    console.log('視覺化編輯器已載入，請選擇一個 Bot 開始編輯');
  }, []);

  const cancelPendingUnsavedAction = () => {
    if (pendingUnsavedAction?.type === 'switchBot' && selectedBotId) {
      selectBot(selectedBotId);
    }
    setPendingUnsavedAction(null);
  };

  const confirmPendingUnsavedAction = () => {
    const action = pendingUnsavedAction;
    confirmingUnsavedActionRef.current = true;
    setPendingUnsavedAction(null);

    if (!action) {
      confirmingUnsavedActionRef.current = false;
      return;
    }

    if (action.type === 'back') {
      navigate(returnTo);
      return;
    }

    void handleBotSelect(action.botId);
  };

  const unsavedDialogTitle =
    pendingUnsavedAction?.type === 'switchBot'
      ? '切換 Bot'
      : '離開編輯器';

  const unsavedDialogDescription =
    pendingUnsavedAction?.type === 'switchBot'
      ? '您有未儲存的變更，切換 Bot 後目前變更將會遺失。'
      : '您有未儲存的變更，離開後目前變更將會遺失。';

  return (
    <VisualEditorProvider selectedBotId={selectedBotId}>
      <DragDropProvider>
        <div className="app-page-surface flex h-screen flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-[var(--bc-line-2)] bg-[color-mix(in_oklch,var(--bc-bg)_82%,transparent)] px-4 py-3 backdrop-blur-2xl sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {/* 返回按鈕 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="app-icon-button shrink-0 border-[var(--bc-line-2)]"
                title={returnLabel}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="hidden min-w-0 sm:block">
                <p className="app-kicker">Visual editor</p>
                <h1 className="truncate text-lg font-semibold text-[var(--bc-ink)]">
                  LINE Bot 視覺化編輯器
                </h1>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="app-soft-icon rounded-full px-3 py-1 text-xs font-semibold">
                  v{projectVersion}
                </div>
                <SaveStatusIndicator 
                  status={saveStatus}
                  lastSavedTime={lastSavedTime}
                  errorMessage={saveError}
                />
              </div>
            </div>
            
            {/* 已將 Rich Menu 作為工作區的獨立標籤 */}
          </div>
        </header>
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
          {isLoadingData && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bc-bg)]/55 backdrop-blur-sm">
              <div className="app-panel flex items-center gap-3 p-4">
                <Loader size="sm" />
                <span className="text-sm font-medium text-[var(--bc-ink-3)]">載入 Bot 數據中...</span>
              </div>
            </div>
          )}
          
          <Workspace
            logicGraph={logicGraph}
            flexBlocks={flexBlocks}
            onLogicGraphChange={setLogicGraph}
            onFlexBlocksChange={setFlexBlocks}
            currentLogicTemplateName={currentLogicTemplateName}
            currentFlexMessageName={currentFlexMessageName}
            isUnsupportedLogicTemplate={isUnsupportedLogicTemplate}
            selectedBotId={selectedBotId}
            selectedLogicTemplateId={selectedLogicTemplateId}
            onLogicTemplateSelect={handleLogicTemplateSelect}
            onLogicTemplateCreate={handleLogicTemplateCreate}
            onLogicTemplateDelete={handleLogicTemplateDelete}
            selectedFlexMessageId={selectedFlexMessageId}
            onFlexMessageSelect={handleFlexMessageSelect}
            onFlexMessageCreate={handleFlexMessageCreate}
            onFlexMessageDelete={handleFlexMessageDelete}
            onBotUpdated={refreshBots}
            initialActiveTab={initialActiveTab}
          />
        </div>
      </div>
      <AlertDialog open={Boolean(pendingUnsavedAction)} onOpenChange={(open) => {
        if (open) return;
        if (confirmingUnsavedActionRef.current) {
          confirmingUnsavedActionRef.current = false;
          return;
        }
        cancelPendingUnsavedAction();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{unsavedDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {unsavedDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelPendingUnsavedAction}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingUnsavedAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              確定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DragDropProvider>
    </VisualEditorProvider>
  );
};
