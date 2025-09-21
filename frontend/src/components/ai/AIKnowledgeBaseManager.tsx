import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../ui/dialog';
import { Settings } from 'lucide-react';
import AIKnowledgeApi, { AIToggle, KnowledgeChunkItem, Scope } from '../../services/aiKnowledgeApi';
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
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<Scope>('project');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<KnowledgeChunkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // 文字輸入與切塊設定
  const [textInput, setTextInput] = useState('');
  const [autoChunk, setAutoChunk] = useState(true);
  const [chunkSize, setChunkSize] = useState(800);
  const [overlap, setOverlap] = useState(80);
  const [uploading, setUploading] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);

  const canOperate = !!botId;

  const loadToggle = async () => {
    if (!botId) return;
    try {
      const s = await AIKnowledgeApi.getAIToggle(botId);
      setAiEnabled(!!s.ai_takeover_enabled);
      setProvider(s.provider || 'groq');
      setSelectedModel(s.model);
    } catch (e) {
      // ignore
    }
  };

  const loadList = async () => {
    if (!botId) return;
    setLoading(true);
    try {
      const res = await AIKnowledgeApi.list(botId, scope, query, page, pageSize);
      setItems(res.items);
      setTotal(res.total);
      setSelected({});
    } catch (e) {
      toast({ variant: 'destructive', title: '讀取失敗', description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadToggle();
  }, [botId]);

  useEffect(() => {
    loadList();
  }, [botId, scope, page]);

  // 載入 Groq 模型列表
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.getAIModels('groq');
        if (res.success && Array.isArray((res.data as any).models)) {
          const list = ((res.data as any).models as Array<any>).map(m => ({ id: m.id as string, name: (m.name as string) || (m.id as string) }));
          setModels(list);
          if (!selectedModel && list.length > 0) {
            setSelectedModel(list[0].id);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [botId]);

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
      setSelectedModel(s.model || modelId);
      toast({ title: '已更新模型', description: modelId });
    } catch (e) {
      toast({ variant: 'destructive', title: '更新模型失敗', description: String(e) });
    }
  };

  const addText = async () => {
    if (!botId || !textInput.trim()) return;
    try {
      await AIKnowledgeApi.addText(botId, scope, textInput.trim(), autoChunk, chunkSize, overlap);
      setTextInput('');
      toast({ title: '已新增文字' });
      setPage(1);
      await loadList();
    } catch (e) {
      toast({ variant: 'destructive', title: '新增失敗', description: String(e) });
    }
  };

  // 高級設定儲存（僅更新狀態即可生效）
  const saveAdvanced = () => {
    // 基本檢核
    const size = Math.min(2000, Math.max(200, Number(chunkSize)));
    const ov = Math.min(400, Math.max(0, Number(overlap)));
    setChunkSize(size);
    setOverlap(ov);
    setAdvOpen(false);
  };

  const onUploadFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (!botId || !e.target.files?.length) return;
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
    try {
      await AIKnowledgeApi.uploadFile(botId, scope, file, chunkSize, overlap);
      toast({ title: '上傳成功' });
      setPage(1);
      await loadList();
    } catch (e) {
      toast({ variant: 'destructive', title: '上傳失敗', description: String(e) });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const doSearch = async () => {
    setPage(1);
    await loadList();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteSelected = async () => {
    if (!botId) return;
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (!ids.length) return;
    try {
      await AIKnowledgeApi.batchDelete(botId, ids);
      toast({ title: '已刪除選取片段' });
      setSelected({});
      await loadList();
    } catch (e) {
      toast({ variant: 'destructive', title: '刪除失敗', description: String(e) });
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
            <Button size="sm" onClick={addText} disabled={!textInput.trim()}>新增</Button>
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
          <Button variant="destructive" onClick={deleteSelected} disabled={!Object.values(selected).some(Boolean)}>批次刪除</Button>
        </div>
      </div>

      {/* 列表 */}
      <div className="border rounded">
        <div className="grid grid-cols-12 px-3 py-2 text-xs text-muted-foreground border-b">
          <div className="col-span-1">選取</div>
          <div className="col-span-7">內容預覽</div>
          <div className="col-span-2">來源</div>
          <div className="col-span-2">更新時間</div>
        </div>
        <div className="divide-y max-h-[40vh] overflow-auto">
          {loading ? (
            <div className="p-4 text-sm">載入中…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">沒有資料</div>
          ) : (
            items.map((it) => (
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
            ))
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-2">
          <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
          <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>上一頁</Button>
          <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>下一頁</Button>
        </div>
      </div>
    </div>
  );
};

export default AIKnowledgeBaseManager;
