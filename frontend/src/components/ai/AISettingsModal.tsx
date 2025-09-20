import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Settings, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AISettingsModalProps {
  onSettingsChange: (settings: AISettings) => void;
  disabled?: boolean;
}

export interface AISettings {
  systemPrompt: string;
  timeRangeDays?: number;
  customDateRange?: {
    from: Date;
    to: Date;
  };
  contextFormat?: string;
}

// 預設系統提示詞
const DEFAULT_SYSTEM_PROMPT = "你是一位專精客服對話洞察的分析助手。請使用繁體中文回答，聚焦於：意圖、重複問題、關鍵需求、常見痛點、情緒/情感傾向、有效回覆策略與改進建議。若資訊不足，請說明不確定並提出需要的補充資訊。";

// 預設時間範圍選項
const TIME_RANGE_OPTIONS = [
  { value: '7', label: '最近 7 天' },
  { value: '30', label: '最近 30 天' },
  { value: '90', label: '最近 90 天' },
  { value: 'all', label: '全部' },
  { value: 'custom', label: '自訂範圍' },
];

// 上下文格式選項
const CONTEXT_FORMAT_OPTIONS = [
  {
    value: 'detailed',
    label: '詳細格式',
    description: '完整時間戳和發送者標識，適合深度分析'
  },
  {
    value: 'standard',
    label: '標準格式',
    description: '簡化時間戳，平衡資訊量和效率'
  },
  {
    value: 'compact',
    label: '精簡格式',
    description: '最小化格式，節省 token 消耗'
  },
];

// localStorage 鍵名
const STORAGE_KEYS = {
  SYSTEM_PROMPT: 'ai_settings_system_prompt',
  TIME_RANGE: 'ai_settings_time_range',
  CUSTOM_DATE_FROM: 'ai_settings_custom_date_from',
  CUSTOM_DATE_TO: 'ai_settings_custom_date_to',
  CONTEXT_FORMAT: 'ai_settings_context_format',
};

export default function AISettingsModal({ onSettingsChange, disabled = false }: AISettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [timeRange, setTimeRange] = useState<string>('30');
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();
  const [contextFormat, setContextFormat] = useState<string>('standard');

  // 從 localStorage 載入設定
  useEffect(() => {
    const savedSystemPrompt = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    const savedTimeRange = localStorage.getItem(STORAGE_KEYS.TIME_RANGE);
    const savedDateFrom = localStorage.getItem(STORAGE_KEYS.CUSTOM_DATE_FROM);
    const savedDateTo = localStorage.getItem(STORAGE_KEYS.CUSTOM_DATE_TO);
    const savedContextFormat = localStorage.getItem(STORAGE_KEYS.CONTEXT_FORMAT);

    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    }
    if (savedTimeRange) {
      setTimeRange(savedTimeRange);
    }
    if (savedDateFrom) {
      setCustomDateFrom(new Date(savedDateFrom));
    }
    if (savedDateTo) {
      setCustomDateTo(new Date(savedDateTo));
    }
    if (savedContextFormat) {
      setContextFormat(savedContextFormat);
    }
  }, []);

  // 儲存設定到 localStorage
  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, systemPrompt);
    localStorage.setItem(STORAGE_KEYS.TIME_RANGE, timeRange);
    localStorage.setItem(STORAGE_KEYS.CONTEXT_FORMAT, contextFormat);
    if (customDateFrom) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_DATE_FROM, customDateFrom.toISOString());
    }
    if (customDateTo) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_DATE_TO, customDateTo.toISOString());
    }
  };

  // 重設為預設值
  const resetToDefaults = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setTimeRange('30');
    setCustomDateFrom(undefined);
    setCustomDateTo(undefined);
    setContextFormat('standard');

    // 清除 localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  };

  // 應用設定
  const applySettings = () => {
    saveSettings();
    
    const settings: AISettings = {
      systemPrompt,
      contextFormat,
    };

    // 處理時間範圍
    if (timeRange === 'custom') {
      if (customDateFrom && customDateTo) {
        settings.customDateRange = {
          from: customDateFrom,
          to: customDateTo,
        };
      }
    } else if (timeRange !== 'all') {
      settings.timeRangeDays = parseInt(timeRange);
    }

    onSettingsChange(settings);
    setOpen(false);
  };

  // 初始載入時應用設定
  useEffect(() => {
    const settings: AISettings = {
      systemPrompt,
      contextFormat,
    };

    if (timeRange === 'custom') {
      if (customDateFrom && customDateTo) {
        settings.customDateRange = {
          from: customDateFrom,
          to: customDateTo,
        };
      }
    } else if (timeRange !== 'all') {
      settings.timeRangeDays = parseInt(timeRange);
    }

    onSettingsChange(settings);
  }, [systemPrompt, timeRange, customDateFrom, customDateTo, contextFormat, onSettingsChange]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="default"
          disabled={disabled}
          className="h-10 px-3"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI 分析設定
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 系統提示詞設定 */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt">系統提示詞</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="輸入自訂的系統提示詞..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-sm text-muted-foreground">
              自訂 AI 助手的角色和行為，影響分析的風格和重點。
            </p>
          </div>

          {/* 對話日期範圍設定 */}
          <div className="space-y-3">
            <Label>對話分析範圍</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="選擇時間範圍" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 自訂日期範圍選擇器 */}
            {timeRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>開始日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customDateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateFrom ? (
                          format(customDateFrom, "yyyy/MM/dd", { locale: zhTW })
                        ) : (
                          "選擇開始日期"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateFrom}
                        onSelect={setCustomDateFrom}
                        disabled={(date) =>
                          date > new Date() || (customDateTo && date > customDateTo)
                        }
                        initialFocus
                        locale={zhTW}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>結束日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customDateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateTo ? (
                          format(customDateTo, "yyyy/MM/dd", { locale: zhTW })
                        ) : (
                          "選擇結束日期"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateTo}
                        onSelect={setCustomDateTo}
                        disabled={(date) =>
                          date > new Date() || (customDateFrom && date < customDateFrom)
                        }
                        initialFocus
                        locale={zhTW}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              選擇要分析的對話時間範圍，影響 AI 分析的資料來源。
            </p>
          </div>

          {/* 上下文格式設定 */}
          <div className="space-y-3">
            <Label>上下文格式</Label>
            <Select value={contextFormat} onValueChange={setContextFormat}>
              <SelectTrigger>
                <SelectValue placeholder="選擇上下文格式" />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              選擇上下文的詳細程度，影響 token 消耗和分析精度。
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              重設預設值
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button onClick={applySettings}>
                套用設定
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
