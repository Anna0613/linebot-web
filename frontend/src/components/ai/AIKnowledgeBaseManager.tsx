import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Settings } from 'lucide-react';
import AIKnowledgeApi, { AIToggle, KnowledgeChunkItem, Scope, KnowledgeSearchItem } from '../../services/aiKnowledgeApi';
import { apiClient } from '../../services/UnifiedApiClient';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

type Props = {
  botId?: string;
};

const pageSize = 10;

export const AIKnowledgeBaseManager: React.FC<Props> = ({ botId }) => {
  const { toast } = useToast();
  const [aiEnabled, setAiEnabled] = useState(false);
  const [provider, setProvider] = useState<string>('groq');
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<Scope>('project');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<KnowledgeChunkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [semanticItems, setSemanticItems] = useState<KnowledgeSearchItem[] | null>(null);

  // 防抖和請求管理
  const loadListTimeoutRef = useRef<NodeJS.Timeout>();
  const isOperatingRef = useRef(false);
  const currentOperationRef = useRef<string>(''); // 追蹤當前操作類型

  // 文字輸入與切塊設定
  const [textInput, setTextInput] = useState('');
  const [autoChunk, setAutoChunk] = useState(true);
  const [chunkSize, setChunkSize] = useState(800);
  const [overlap, setOverlap] = useState(80);
  const [uploading, setUploading] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const [ragThreshold, setRagThreshold] = useState<number | undefined>(undefined);
  const [ragTopK, setRagTopK] = useState<number | undefined>(undefined);
  const [historyN, setHistoryN] = useState<number | undefined>(undefined);
  const [systemPrompt, setSystemPrompt] = useState<string>('');

  const canOperate = !!botId;

  const loadToggle = useCallback(async () => {
    if (!botId) return;
    try {
      const s = await AIKnowledgeApi.getAIToggle(botId);
      setAiEnabled(!!s.ai_takeover_enabled);
      setProvider(s.provider || 'groq');
      setSelectedModel(s.model || '');
      setRagThreshold(s.rag_threshold);
      setRagTopK(s.rag_top_k);
      setHistoryN(s.history_messages);
      setSystemPrompt(s.system_prompt || '你是一個對話助理。若提供了知識片段，請優先引用並準確回答；若未提供或不足，也可依一般常識與推理能力完整作答。');
    } catch (_err) {
      // ignore
    }
  }, [botId]);

  const loadList = useCallback(async (immediate = false) => {
    if (!botId) return;

    // 清除之前的防抖計時器
    if (loadListTimeoutRef.current) {
      clearTimeout(loadListTimeoutRef.current);
    }

    const doLoad = async () => {
      if (isOperatingRef.current && !immediate) {
        // 如果正在進行其他操作且不是立即載入，則延遲執行
        loadListTimeoutRef.current = setTimeout(() => doLoad(), 1000);
        return;
      }

      setLoading(true);
      try {
        const res = await AIKnowledgeApi.list(botId, scope, undefined, page, pageSize);
        setItems(res.items);
        setTotal(res.total);
        setSelected({});
        setSemanticItems(null);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        // 對於超時錯誤，提供更友好的提示
        if (errorMessage.includes('超時') || errorMessage.includes('timeout')) {
          toast({
            variant: 'destructive',
            title: '載入超時',
            description: '知識庫載入時間較長，請稍後重新整理頁面查看最新內容'
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
      // 防抖延遲
      loadListTimeoutRef.current = setTimeout(doLoad, 300);
    }
  }, [botId, scope, page, toast]);

  useEffect(() => {
    loadToggle();
  }, [loadToggle]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // 組件清理
  useEffect(() => {
    return () => {
      if (loadListTimeoutRef.current) {
        clearTimeout(loadListTimeoutRef.current);
      }
      isOperatingRef.current = false;
      currentOperationRef.current = '';
    };
  }, []);

  // 載入 Groq 模型列表
  useEffect(() => {
    const isModel = (m: unknown): m is { id: string; name?: string } =>
      !!m && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string';

    (async () => {
      try {
        const res = await apiClient.getAIModels('groq');
        if (res.success) {
          const data = res.data as unknown;
          const modelsRaw =
            data && typeof data === 'object' && Array.isArray((data as { models?: unknown[] }).models)
              ? (data as { models: unknown[] }).models
              : [];
          const list = modelsRaw.filter(isModel).map((m) => ({ id: m.id, name: m.name || m.id }));
          setModels(list);
          if (selectedModel === '' && list.length > 0) {
            setSelectedModel(list[0].id);
          }
        }
      } catch (_err) {
        // ignore
      }
    })();
  }, [botId, selectedModel]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const toggleAI = async (value: boolean) => {
    if (!botId) return;
    try {
      setAiEnabled(value);
      await AIKnowledgeApi.setAIToggle(botId, value, provider, selectedModel);
      toast({ title: '已更新', description: `AI 接管已${value ? '啟用' : '停用'}` });
    } catch (e) {
      setAiEnabled(!value);
      toast({ variant: 'destructive', title: '更新失敗', description: String(e) });
    }
  };

  const updateModel = async (modelId: string) => {
    if (!botId) return;
    try {
      setSelectedModel(modelId);
      const s: AIToggle = await AIKnowledgeApi.setAIToggle(botId, aiEnabled, 'groq', modelId);
      setProvider(s.provider || 'groq');
      setSelectedModel(s.model || modelId || '');
      toast({ title: '已更新模型', description: modelId });
    } catch (e) {
      toast({ variant: 'destructive', title: '更新模型失敗', description: String(e) });
    }
  };

  const addText = async () => {
    if (!botId || !textInput.trim() || isOperatingRef.current) return;

    const operationId = 'addText';
    isOperatingRef.current = true;
    currentOperationRef.current = operationId;

    try {
      await AIKnowledgeApi.addText(botId, scope, textInput.trim(), autoChunk, chunkSize, overlap);

      // 檢查操作是否仍然是當前操作（避免競態條件）
      if (currentOperationRef.current === operationId) {
        setTextInput('');
        toast({ title: '已新增文字' });
        setPage(1);

        // 延遲重新載入列表，給後端處理時間
        setTimeout(() => {
          if (currentOperationRef.current === operationId) {
            loadList(true);
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

        // 對於超時錯誤，提供更友好的提示
        if (errorMessage.includes('超時') || errorMessage.includes('timeout') ||
            errorMessage.includes('處理時間較長')) {
          toast({
            title: '新增處理中',
            description: '文字正在處理中，請稍後重新整理頁面查看結果',
            variant: 'default'
          });
          // 即使超時也嘗試重新載入列表
          setTimeout(() => loadList(true), 2000);
        } else {
          toast({ variant: 'destructive', title: '新增失敗', description: errorMessage });
        }
      }
    }
  };

  // 高級設定儲存（僅更新狀態即可生效）
  const saveAdvanced = async () => {
    // 基本檢核
    const size = Math.min(2000, Math.max(200, Number(chunkSize)));
    const ov = Math.min(400, Math.max(0, Number(overlap)));
    setChunkSize(size);
    setOverlap(ov);
    // RAG 參數檢核
    const th = ragThreshold === undefined ? undefined : Math.min(1, Math.max(0, Number(ragThreshold)));
    const tk = ragTopK === undefined ? undefined : Math.max(1, Number(ragTopK));
    const hn = historyN === undefined ? undefined : Math.max(0, Number(historyN));
    if (botId) {
      try {
        await AIKnowledgeApi.setAIAdvanced(botId, {
          rag_threshold: th,
          rag_top_k: tk,
          history_messages: hn,
          provider,
          model: selectedModel,
          enabled: aiEnabled,
          system_prompt: systemPrompt,
        });
        toast({ title: '已儲存高級設定' });
      } catch (e) {
        toast({ variant: 'destructive', title: '儲存失敗', description: String(e) });
      }
    }
    setAdvOpen(false);
  };

  const onUploadFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (!botId || !e.target.files?.length || isOperatingRef.current) return;
    const file = e.target.files[0];
    if (!file) return;
    if (!/(txt|pdf|docx)$/i.test(file.name)) {
      toast({ variant: 'destructive', title: '格式不支援', description: '僅支援 .txt, .pdf, .docx' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: '檔案過大', description: '限制 10MB' });
      return;
    }

    setUploading(true);
    isOperatingRef.current = true;
    try {
      await AIKnowledgeApi.uploadFile(botId, scope, file, chunkSize, overlap);
      toast({ title: '上傳成功' });
      setPage(1);
      // 延遲重新載入列表，給後端處理時間
      setTimeout(() => {
        loadList(true);
        isOperatingRef.current = false;
      }, 1000); // 文件上傳需要更長的處理時間
    } catch (e) {
      isOperatingRef.current = false;
      const errorMessage = e instanceof Error ? e.message : String(e);

      // 對於超時錯誤，提供更友好的提示
      if (errorMessage.includes('超時') || errorMessage.includes('timeout') ||
          errorMessage.includes('處理時間較長')) {
        toast({
          title: '上傳處理中',
          description: '檔案正在處理中，請稍後重新整理頁面查看結果',
          variant: 'default'
        });
        // 即使超時也嘗試重新載入列表
        setTimeout(() => loadList(true), 3000);
      } else {
        toast({ variant: 'destructive', title: '上傳失敗', description: errorMessage });
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const doSearch = async () => {
    if (!botId) return;
    const q = query.trim();
    if (!q) {
      setSemanticItems(null);
      setPage(1);
      await loadList();
      return;
    }
    setLoading(true);
    try {
      const results = await AIKnowledgeApi.search(botId, q);
      setSemanticItems(results);
      setSelected({});
    } catch (e) {
      toast({ variant: 'destructive', title: '搜尋失敗', description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteSelected = async () => {
    if (!botId || isOperatingRef.current) return;
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (!ids.length) return;

    const operationId = 'deleteSelected';
    isOperatingRef.current = true;
    currentOperationRef.current = operationId;

    try {
      await AIKnowledgeApi.batchDelete(botId, ids);

      // 檢查操作是否仍然是當前操作
      if (currentOperationRef.current === operationId) {
        toast({ title: '已刪除選取片段' });
        setSelected({});

        // 延遲重新載入列表，給後端處理時間
        setTimeout(() => {
          if (currentOperationRef.current === operationId) {
            loadList(true);
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

        // 對於超時錯誤，提供更友好的提示
        if (errorMessage.includes('超時') || errorMessage.includes('timeout') ||
            errorMessage.includes('處理時間較長')) {
          toast({
            title: '刪除處理中',
            description: '刪除操作正在處理中，請稍後重新整理頁面查看結果',
            variant: 'default'
          });
          setSelected({}); // 清除選擇狀態
          // 即使超時也嘗試重新載入列表
          setTimeout(() => loadList(true), 2000);
        } else {
          toast({ variant: 'destructive', title: '刪除失敗', description: errorMessage });
        }
      }
    }
  };

  if (!canOperate) {
    return (
      <div className="p-4 text-sm text-muted-foreground">請先在上方選擇一個 Bot</div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-auto">
      {/* AI 接管開關與篩選 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">AI 接管</span>
            <Switch checked={aiEnabled} onCheckedChange={toggleAI} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Groq 模型</span>
            <Select value={selectedModel} onValueChange={(v) => updateModel(v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="選擇模型" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={scope === 'project' ? 'default' : 'secondary'} onClick={() => { setScope('project'); setPage(1); }}>專案知識庫</Button>
          <Button variant={scope === 'global' ? 'default' : 'secondary'} onClick={() => { setScope('global'); setPage(1); }}>全域知識庫</Button>
        </div>
      </div>

      {/* 系統提示詞 */}
      <div className="border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">AI 系統提示詞</div>
          <Button size="sm" variant="secondary" onClick={saveAdvanced}>儲存</Button>
        </div>
        <Textarea rows={4} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="輸入此 Bot 的 AI 系統提示詞…" />
        <p className="text-xs text-muted-foreground mt-2">提示詞會影響此 Bot 的 AI 回覆風格與策略。</p>
      </div>

      {/* 新增/上傳 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 新增文字內容（單一區塊） */}
        <div className="border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">新增文字內容</div>
            <Dialog open={advOpen} onOpenChange={setAdvOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="高級設定">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>高級設定</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  設定文本切塊、相似度門檻、TopK 以及歷史對話數量等參數，影響檢索與回答品質。
                </DialogDescription>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm">自動切塊</label>
                    <Switch checked={autoChunk} onCheckedChange={setAutoChunk} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">切塊大小</span>
                      <Input type="number" className="w-24" value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">重疊</span>
                      <Input type="number" className="w-24" value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">建議：切塊 500-1000，重疊 50-100。</p>
                  <div className="h-px bg-muted" />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">相似度門檻</span>
                      <Input type="number" step="0.05" min={0} max={1} className="w-24" value={ragThreshold ?? ''} onChange={(e) => setRagThreshold(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">TopK</span>
                      <Input type="number" min={1} className="w-24" value={ragTopK ?? ''} onChange={(e) => setRagTopK(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">最近 N 則對話</span>
                      <Input type="number" min={0} className="w-24" value={historyN ?? ''} onChange={(e) => setHistoryN(e.target.value === '' ? undefined : Number(e.target.value))} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">不填則使用預設：門檻 0.7、TopK 5、最近 0 則。</p>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setAdvOpen(false)}>取消</Button>
                  <Button onClick={saveAdvanced}>儲存</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="輸入或貼上文字…" />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={autoChunk} onCheckedChange={setAutoChunk} /> 自動切塊
            </label>
            <Button size="sm" onClick={addText} disabled={!textInput.trim() || isOperatingRef.current}>
              {isOperatingRef.current ? '處理中...' : '新增'}
            </Button>
          </div>
        </div>
        {/* 檔案上傳 */}
        <div className="border rounded p-3">
          <div className="font-medium mb-2">上傳檔案（.txt / .pdf / .docx）</div>
          <Input type="file" accept=".txt,.pdf,.docx" onChange={onUploadFile} disabled={uploading} />
          <p className="text-xs text-muted-foreground mt-2">切塊大小與重疊使用「高級設定」。</p>
        </div>
      </div>

      {/* 搜尋與批次操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input className="w-80" placeholder="搜尋切片內容…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }} />
          <Button onClick={doSearch}>搜尋</Button>
        </div>
        <div>
          <Button
            variant="destructive"
            onClick={deleteSelected}
            disabled={!Object.values(selected).some(Boolean) || isOperatingRef.current}
          >
            {isOperatingRef.current ? '處理中...' : '批次刪除'}
          </Button>
        </div>
      </div>

      {/* 列表 / 語意搜尋結果 */}
      <div className="border rounded">
        <div className="grid grid-cols-12 px-3 py-2 text-xs text-muted-foreground border-b">
          <div className="col-span-1">選取</div>
          <div className="col-span-7">內容預覽</div>
          {semanticItems ? (
            <>
              <div className="col-span-2">相關度</div>
              <div className="col-span-2">—</div>
            </>
          ) : (
            <>
              <div className="col-span-2">來源</div>
              <div className="col-span-2">更新時間</div>
            </>
          )}
        </div>
        <div className="divide-y max-h-[40vh] overflow-auto">
          {loading ? (
            <div className="p-4 text-sm">載入中…</div>
          ) : (semanticItems ? semanticItems.length === 0 : items.length === 0) ? (
            <div className="p-4 text-sm text-muted-foreground">沒有資料</div>
          ) : (
            (semanticItems
              ? semanticItems.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 px-3 py-2 items-center">
                    <div className="col-span-1">
                      <input type="checkbox" checked={!!selected[it.id]} onChange={() => toggleSelect(it.id)} />
                    </div>
                    <div className="col-span-7 text-sm pr-4 line-clamp-2">
                      {it.content.length > 160 ? `${it.content.slice(0, 160)}…` : it.content}
                    </div>
                    <div className="col-span-2 text-xs">{it.score.toFixed(3)}</div>
                    <div className="col-span-2 text-xs">—</div>
                  </div>
                ))
              : items.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 px-3 py-2 items-center">
                    <div className="col-span-1">
                      <input type="checkbox" checked={!!selected[it.id]} onChange={() => toggleSelect(it.id)} />
                    </div>
                    <div className="col-span-7 text-sm pr-4 line-clamp-2">
                      {it.content.length > 160 ? `${it.content.slice(0, 160)}…` : it.content}
                    </div>
                    <div className="col-span-2 text-xs">{it.source_type}</div>
                    <div className="col-span-2 text-xs">{it.updated_at?.slice(0, 19).replace('T', ' ')}</div>
                  </div>
                )))
          )}
        </div>
        {!semanticItems && (
          <div className="flex items-center justify-end gap-2 p-2">
            <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>上一頁</Button>
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>下一頁</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIKnowledgeBaseManager;
