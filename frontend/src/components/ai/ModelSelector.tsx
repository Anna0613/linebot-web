import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import {
  Brain, Zap, Scale, Wrench, Crown, Eye, Globe,
  FileText, Star, Clock, Feather, Shield, Settings
} from 'lucide-react';
import { apiClient } from '@/services/UnifiedApiClient';
import { useToast } from '@/components/ui/use-toast';

interface AIModel {
  id: string;
  name: string;
  description: string;
  category: string;
  max_tokens: number;
  context_length: number;
}

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case '旗艦':
      return <Crown className="h-3 w-3" />;
    case '高效能':
      return <Zap className="h-3 w-3" />;
    case '多模態':
      return <Eye className="h-3 w-3" />;
    case '推理':
      return <Brain className="h-3 w-3" />;
    case '多語言':
      return <Globe className="h-3 w-3" />;
    case '長文本':
      return <FileText className="h-3 w-3" />;
    case '經典':
      return <Star className="h-3 w-3" />;
    case '快速':
      return <Clock className="h-3 w-3" />;
    case '平衡':
      return <Scale className="h-3 w-3" />;
    case '輕量':
      return <Feather className="h-3 w-3" />;
    case '安全':
      return <Shield className="h-3 w-3" />;
    case '系統':
      return <Settings className="h-3 w-3" />;
    case '專業':
      return <Wrench className="h-3 w-3" />;
    default:
      return <Brain className="h-3 w-3" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case '旗艦':
      return 'bg-yellow-100 text-yellow-800';
    case '高效能':
      return 'bg-red-100 text-red-800';
    case '多模態':
      return 'bg-indigo-100 text-indigo-800';
    case '推理':
      return 'bg-violet-100 text-violet-800';
    case '多語言':
      return 'bg-emerald-100 text-emerald-800';
    case '長文本':
      return 'bg-orange-100 text-orange-800';
    case '經典':
      return 'bg-amber-100 text-amber-800';
    case '快速':
      return 'bg-blue-100 text-blue-800';
    case '平衡':
      return 'bg-green-100 text-green-800';
    case '輕量':
      return 'bg-cyan-100 text-cyan-800';
    case '安全':
      return 'bg-slate-100 text-slate-800';
    case '系統':
      return 'bg-teal-100 text-teal-800';
    case '專業':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = ''
}) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAIModels();
        
        if (response.success && response.data) {
          const data = response.data as { models: AIModel[]; current_provider: string };
          setModels(data.models);
          setCurrentProvider(data.current_provider);
          
          // 如果沒有選中的模型，選擇第一個
          if (!value && data.models.length > 0) {
            onChange(data.models[0].id);
          }
        } else {
          throw new Error(response.error || '載入模型列表失敗');
        }
      } catch (error) {
        console.error('載入 AI 模型失敗:', error);
        toast({
          variant: 'destructive',
          title: '載入失敗',
          description: '無法載入 AI 模型列表，請檢查後端設定'
        });
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [onChange, value, toast]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader />
        <span className="text-sm text-muted-foreground">載入模型...</span>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        無可用模型
      </div>
    );
  }

  const selectedModel = models.find(m => m.id === value);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">AI 模型</span>
        <Badge variant="outline" className="text-xs">
          {currentProvider.toUpperCase()}
        </Badge>
      </div>
      
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="選擇 AI 模型">
            {selectedModel && (
              <div className="flex items-center gap-2">
                {getCategoryIcon(selectedModel.category)}
                <span>{selectedModel.name}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getCategoryColor(selectedModel.category)}`}
                >
                  {selectedModel.category}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col gap-1 py-1">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(model.category)}
                  <span className="font-medium">{model.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getCategoryColor(model.category)}`}
                  >
                    {model.category}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {model.description}
                </div>
                <div className="text-xs text-muted-foreground">
                  最大輸出: {model.max_tokens.toLocaleString()} tokens
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedModel && (
        <div className="text-xs text-muted-foreground">
          {selectedModel.description}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
