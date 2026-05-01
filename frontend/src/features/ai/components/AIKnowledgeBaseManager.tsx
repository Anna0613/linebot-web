import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Plus, Search, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AIKnowledgeApi, { KnowledgeDocumentItem, Scope } from '../api/aiKnowledgeApi';
import { API_CONFIG } from '@/config/apiConfig';
import ProcessingJobTracker from './ProcessingJobTracker';

type Props = {
  botId?: string;
};

const pageSize = 10;
const knowledgeScope: Scope = 'project';
const defaultProvider = 'groq';
const defaultModel = 'openai/gpt-oss-120b';
const defaultChunkSize = 800;
const defaultOverlap = 80;
const defaultSystemPrompt = '你是一個對話助理。若提供了知識片段，請優先引用並準確回答；若未提供或不足，也可依一般常識與推理能力完整作答。';

const sourceTypeLabel = (sourceType: string) => {
  if (sourceType === 'text') return '文字';
  if (sourceType === 'file') return '檔案';
  if (sourceType === 'bulk') return '批次';
  return sourceType || '未知';
};

export const AIKnowledgeBaseManager: React.FC<Props> = ({ botId }) => {
  const { toast } = useToast();
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<KnowledgeDocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadListTimeoutRef = useRef<NodeJS.Timeout>();
  const isOperatingRef = useRef(false);
  const currentOperationRef = useRef('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
  const selectedCount = items.filter(item => selected[item.id]).length;
  const isAllSelected = items.length > 0 && selectedCount === items.length;
  const isPartialSelected = selectedCount > 0 && selectedCount < items.length;
  const canOperate = Boolean(botId);

  const loadList = useCallback(async (immediate = false, targetPage = page, searchTerm = submittedQuery) => {
    if (!botId) return;

    if (loadListTimeoutRef.current) {
      clearTimeout(loadListTimeoutRef.current);
    }

    const doLoad = async () => {
      if (isOperatingRef.current && !immediate) {
        loadListTimeoutRef.current = setTimeout(() => doLoad(), 1000);
        return;
      }

      setLoading(true);
      try {
        const res = await AIKnowledgeApi.listDocuments(botId, knowledgeScope, searchTerm, targetPage, pageSize);
        setItems(res.items);
        setTotal(res.total);
        setSelected({});
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes('超時') || errorMessage.includes('timeout')) {
          toast({
            variant: 'destructive',
            title: '載入超時',
            description: '知識庫載入時間較長，請稍後重新整理頁面查看最新內容',
          });
        } else {
          toast({ variant: 'destructive', title: '讀取失敗', description: errorMessage });
        }
      } finally {
        setLoading(false);
      }
    };

    if (immediate) {
      await doLoad();
    } else {
      loadListTimeoutRef.current = setTimeout(doLoad, 300);
    }
  }, [botId, page, submittedQuery, toast]);

  const loadToggle = useCallback(async () => {
    if (!botId) return;

    try {
      const settings = await AIKnowledgeApi.getAIToggle(botId);
      const enabled = Boolean(settings.ai_takeover_enabled);
      setAiEnabled(enabled);

      if (settings.provider !== defaultProvider || settings.model !== defaultModel) {
        const nextSettings = await AIKnowledgeApi.setAIAdvanced(botId, {
          enabled,
          provider: defaultProvider,
          model: defaultModel,
          system_prompt: settings.system_prompt || defaultSystemPrompt,
        });
        setAiEnabled(Boolean(nextSettings.ai_takeover_enabled));
      }
    } catch (_err) {
      // Keep the page usable even if settings are temporarily unavailable.
    }
  }, [botId]);

  useEffect(() => {
    loadToggle();
  }, [loadToggle]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    return () => {
      if (loadListTimeoutRef.current) {
        clearTimeout(loadListTimeoutRef.current);
      }
      isOperatingRef.current = false;
      currentOperationRef.current = '';
      setDeleting(false);
      setUploading(false);
    };
  }, []);

  const handleJobCompleted = useCallback(() => {
    loadList(true);
  }, [loadList]);

  const handleJobFailed = useCallback((jobId: string, error: string) => {
    console.error(`任務 ${jobId} 失敗:`, error);
  }, []);

  const toggleAI = async (value: boolean) => {
    if (!botId) return;

    try {
      setAiEnabled(value);
      await AIKnowledgeApi.setAIToggle(botId, value, defaultProvider, defaultModel);
      toast({ title: '已更新', description: `AI 接管已${value ? '啟用' : '停用'}` });
    } catch (e) {
      setAiEnabled(!value);
      toast({ variant: 'destructive', title: '更新失敗', description: String(e) });
    }
  };

  const addText = async () => {
    if (!botId || !textInput.trim() || isOperatingRef.current) return;

    const operationId = 'addText';
    isOperatingRef.current = true;
    currentOperationRef.current = operationId;

    try {
      await AIKnowledgeApi.addText(
        botId,
        knowledgeScope,
        textInput.trim(),
        true,
        defaultChunkSize,
        defaultOverlap,
      );

      if (currentOperationRef.current === operationId) {
        setTextInput('');
        setTextDialogOpen(false);
        setQuery('');
        setSubmittedQuery('');
        setPage(1);
        toast({ title: '已新增文字' });

        setTimeout(() => {
          if (currentOperationRef.current === operationId) {
            loadList(true, 1, '');
            isOperatingRef.current = false;
            currentOperationRef.current = '';
          }
        }, 500);
      }
    } catch (e) {
      if (currentOperationRef.current === operationId) {
        isOperatingRef.current = false;
        currentOperationRef.current = '';

        const errorMessage = e instanceof Error ? e.message : String(e);
        if (
          errorMessage.includes('超時') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('處理時間較長')
        ) {
          toast({
            title: '新增處理中',
            description: '文字正在處理中，請稍後重新整理頁面查看結果',
            variant: 'default',
          });
          setTimeout(() => loadList(true), 2000);
        } else {
          toast({ variant: 'destructive', title: '新增失敗', description: errorMessage });
        }
      }
    }
  };

  const validateFile = (file: File) => {
    if (!/(txt|pdf|docx)$/i.test(file.name)) {
      toast({ variant: 'destructive', title: '格式不支援', description: '僅支援 .txt, .pdf, .docx' });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: '檔案過大', description: '限制 10MB' });
      return false;
    }

    return true;
  };

  const handleFileUpload = async (file: File) => {
    if (!botId || isOperatingRef.current || !validateFile(file)) return;

    setUploading(true);
    isOperatingRef.current = true;

    const operationId = 'fileUpload';
    currentOperationRef.current = operationId;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scope', knowledgeScope);
      formData.append('chunk_size', String(defaultChunkSize));
      formData.append('overlap', String(defaultOverlap));

      const response = await fetch(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/file/async`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`上傳失敗: ${response.statusText}`);
      }

      const job = await response.json();

      if (currentOperationRef.current === operationId) {
        toast({
          title: '檔案已提交處理',
          description: `任務 ID: ${job.job_id}，請查看下方進度追蹤`,
        });
        setQuery('');
        setSubmittedQuery('');
        setPage(1);
        isOperatingRef.current = false;
        currentOperationRef.current = '';
      }
    } catch (e) {
      if (currentOperationRef.current === operationId) {
        isOperatingRef.current = false;
        currentOperationRef.current = '';

        const errorMessage = e instanceof Error ? e.message : String(e);
        const isTimeoutButMaybeSuccess =
          errorMessage.includes('超時') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('處理時間較長') ||
          errorMessage.includes('檔案上傳處理時間較長');

        if (isTimeoutButMaybeSuccess) {
          toast({
            title: '上傳處理中',
            description: '檔案正在處理中，請稍後重新整理頁面查看結果',
            variant: 'default',
          });
          setTimeout(() => loadList(true), 3000);
        } else {
          toast({ variant: 'destructive', title: '上傳失敗', description: errorMessage });
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileSelect: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleFileUpload(file);
  };

  const submitSearch = () => {
    const nextQuery = query.trim();
    setPage(1);

    if (nextQuery === submittedQuery) {
      void loadList(true, 1, nextQuery);
      return;
    }

    setSubmittedQuery(nextQuery);
  };

  const clearSearch = () => {
    setQuery('');
    setPage(1);

    if (!submittedQuery) {
      void loadList(true, 1, '');
      return;
    }

    setSubmittedQuery('');
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelected(prev => {
        const next = { ...prev };
        items.forEach(item => {
          delete next[item.id];
        });
        return next;
      });
      return;
    }

    setSelected(prev => {
      const next = { ...prev };
      items.forEach(item => {
        next[item.id] = true;
      });
      return next;
    });
  };

  const deleteSelected = async () => {
    if (!botId || isOperatingRef.current || deleting) return;
    const ids = Object.entries(selected).filter(([, value]) => value).map(([id]) => id);
    if (!ids.length) return;

    const confirmMessage = `確定要刪除 ${ids.length} 個文件嗎？`;
    if (!window.confirm(confirmMessage)) return;

    const operationId = 'deleteSelected';
    setDeleting(true);
    isOperatingRef.current = true;
    currentOperationRef.current = operationId;

    try {
      await AIKnowledgeApi.batchDeleteDocuments(botId, ids);

      if (currentOperationRef.current === operationId) {
        toast({ title: `已刪除 ${ids.length} 個文件` });
        setSelected({});

        setTimeout(() => {
          if (currentOperationRef.current === operationId) {
            loadList(true);
            isOperatingRef.current = false;
            currentOperationRef.current = '';
            setDeleting(false);
          }
        }, 500);
      }
    } catch (e) {
      if (currentOperationRef.current === operationId) {
        isOperatingRef.current = false;
        currentOperationRef.current = '';
        setDeleting(false);

        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes('超時') || errorMessage.includes('timeout') || errorMessage.includes('處理時間較長')) {
          toast({
            title: '刪除處理中',
            description: '刪除操作正在處理中，請稍後重新整理頁面查看結果',
            variant: 'default',
          });
          setSelected({});
          setTimeout(() => loadList(true), 2000);
        } else {
          toast({ variant: 'destructive', title: '刪除失敗', description: errorMessage });
        }
      }
    }
  };

  if (!canOperate) {
    return (
      <div className="p-4 text-sm text-muted-foreground">請先在前一頁選擇一個 Bot</div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="rounded-lg border bg-background">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">檔案列表</h3>
            <p className="text-xs text-muted-foreground">此 Line Bot 的知識庫文件</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span>AI 接管</span>
              <Switch checked={aiEnabled} onCheckedChange={toggleAI} />
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.docx"
              className="hidden"
              onChange={onFileSelect}
              disabled={uploading}
            />
            <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
              <PopoverTrigger asChild>
                <Button type="button" size="icon" aria-label="新增知識">
                  {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  <span className="sr-only">新增知識</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setTextDialogOpen(true);
                  }}
                >
                  <FileText aria-hidden="true" />
                  輸入文字
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  disabled={uploading}
                  onClick={() => {
                    setAddMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload aria-hidden="true" />
                  上傳檔案
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <Input
              className="max-w-md"
              placeholder="搜尋檔案名稱"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitSearch();
              }}
            />
            <Button type="button" variant="secondary" onClick={submitSearch}>
              <Search aria-hidden="true" />
              搜尋
            </Button>
            {submittedQuery && (
              <Button type="button" variant="ghost" onClick={clearSearch}>
                清除
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="destructive"
            onClick={deleteSelected}
            disabled={!Object.values(selected).some(Boolean) || isOperatingRef.current || deleting}
          >
            {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            {deleting ? '刪除中...' : '刪除'}
          </Button>
        </div>

        <div className="grid grid-cols-12 border-b px-3 py-2 text-xs text-muted-foreground">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = isPartialSelected;
                }
              }}
              onChange={toggleSelectAll}
              disabled={items.length === 0}
              title={isAllSelected ? '取消全選' : '全選'}
            />
          </div>
          <div className="col-span-6">檔案名稱 / AI 摘要</div>
          <div className="col-span-2">類型</div>
          <div className="col-span-3">更新時間</div>
        </div>

        <div className="max-h-[52vh] divide-y overflow-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              載入中...
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">沒有資料</div>
          ) : (
            items.map(item => (
              <div key={item.id} className="grid grid-cols-12 items-center px-3 py-3 hover:bg-muted/40">
                <div className="col-span-1">
                  <input type="checkbox" checked={Boolean(selected[item.id])} onChange={() => toggleSelect(item.id)} />
                </div>
                <div className="col-span-6 pr-4 text-sm">
                  <div className="line-clamp-1 font-medium text-foreground">
                    {item.title || item.original_file_name || '未命名文件'}
                  </div>
                  {item.ai_summary && (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.ai_summary}
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-xs">
                  <span className="inline-flex rounded-sm bg-blue-100 px-2 py-1 text-blue-700">
                    {sourceTypeLabel(item.source_type)}
                  </span>
                </div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  {item.updated_at?.slice(0, 19).replace('T', ' ')}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-3 py-2">
          <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
          <Button size="sm" variant="secondary" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page <= 1}>上一頁</Button>
          <Button size="sm" variant="secondary" onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>下一頁</Button>
        </div>
      </div>

      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>輸入文字</DialogTitle>
            <DialogDescription>文字會新增為目前 Line Bot 的知識文件。</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={8}
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            placeholder="輸入或貼上文字內容..."
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setTextDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={addText} disabled={!textInput.trim() || isOperatingRef.current}>
              {isOperatingRef.current ? '處理中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {botId && (
        <ProcessingJobTracker
          botId={botId}
          onJobCompleted={handleJobCompleted}
          onJobFailed={handleJobFailed}
        />
      )}
    </div>
  );
};

export default AIKnowledgeBaseManager;
