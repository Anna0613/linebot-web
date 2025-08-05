import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '../../utils/performanceMonitor';
import { Activity, Clock, Zap, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PerformanceDashboardProps {
  isVisible: boolean;
  onToggle: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isVisible, onToggle }) => {
  const { getMetrics, getAnalysis } = usePerformanceMonitor();
  const [metrics, setMetrics] = useState(getMetrics());
  const [analysis, setAnalysis] = useState(getAnalysis());
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // 定期更新性能指標
  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setMetrics(getMetrics());
        setAnalysis(getAnalysis());
      }, 2000);
      setUpdateInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (updateInterval) {
        clearInterval(updateInterval);
        setUpdateInterval(null);
      }
    }
  }, [isVisible, getMetrics, getAnalysis]);

  // 格式化時間
  const formatTime = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 格式化記憶體
  const formatMemory = (mb: number): string => {
    if (mb < 1024) return `${mb.toFixed(1)}MB`;
    return `${(mb / 1024).toFixed(2)}GB`;
  };

  // 獲取性能分數顏色
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 獲取趨勢圖標
  const getTrendIcon = (trend: 'increasing' | 'stable' | 'decreasing') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="顯示性能儀表板"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto z-50">
      {/* 標題欄 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">性能監控</h3>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600"
          title="隱藏儀表板"
        >
          ×
        </button>
      </div>

      {/* 性能分數 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">整體性能分數</span>
          <div className="flex items-center space-x-1">
            <span className={`text-2xl font-bold ${getScoreColor(analysis.performanceScore)}`}>
              {analysis.performanceScore}
            </span>
            <span className="text-sm text-gray-500">/100</span>
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              analysis.performanceScore >= 90 ? 'bg-green-500' :
              analysis.performanceScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${analysis.performanceScore}%` }}
          />
        </div>
      </div>

      {/* 實時指標 */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-gray-600">組件渲染</span>
          </div>
          <span className={`font-mono ${metrics.componentRenderTime > 16 ? 'text-red-600' : 'text-green-600'}`}>
            {formatTime(metrics.componentRenderTime)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-600">用戶交互</span>
          </div>
          <span className={`font-mono ${metrics.userInteractionDelay > 100 ? 'text-red-600' : 'text-green-600'}`}>
            {formatTime(metrics.userInteractionDelay)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <span className="text-gray-600">積木操作</span>
          </div>
          <span className="font-mono text-gray-800">
            {formatTime(metrics.blockOperationTime)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span className="text-gray-600">記憶體使用</span>
            {getTrendIcon(analysis.memoryTrend)}
          </div>
          <span className="font-mono text-gray-800">
            {formatMemory(metrics.memoryUsage)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600">API 響應</span>
          </div>
          <span className="font-mono text-gray-800">
            {formatTime(metrics.apiResponseTime)}
          </span>
        </div>
      </div>

      {/* 瓶頸警告 */}
      {analysis.bottlenecks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 text-orange-500 mr-1" />
            性能瓶頸
          </h4>
          <div className="space-y-2">
            {analysis.bottlenecks.slice(0, 3).map((bottleneck, index) => (
              <div 
                key={index}
                className={`p-2 rounded text-xs ${
                  bottleneck.severity === 'high' ? 'bg-red-50 border border-red-200' :
                  bottleneck.severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-blue-50 border border-blue-200'
                }`}
              >
                <div className={`font-medium ${
                  bottleneck.severity === 'high' ? 'text-red-700' :
                  bottleneck.severity === 'medium' ? 'text-yellow-700' :
                  'text-blue-700'
                }`}>
                  {bottleneck.description}
                </div>
                <div className="text-gray-600 mt-1">
                  {bottleneck.solution}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 優化建議 */}
      {analysis.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            優化建議
          </h4>
          <div className="space-y-1">
            {analysis.recommendations.slice(0, 2).map((recommendation, index) => (
              <div key={index} className="text-xs text-gray-600 bg-green-50 p-2 rounded border border-green-200">
                {recommendation}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 狀態指示器 */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>實時監控</span>
          </div>
          <span>每 2 秒更新</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;