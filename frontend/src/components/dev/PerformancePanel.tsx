/**
 * 開發工具效能面板 - 僅在開發環境顯示
 */

import React, { useState, useEffect } from 'react';
import { performanceTest } from '@/utils/performanceTest';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface PerformancePanelProps {
  isVisible?: boolean;
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ 
  isVisible = process.env.NODE_ENV === 'development' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // 如果不是開發環境或不可見，不渲染
  if (!isVisible) return null;

  const handleRunTest = async () => {
    setIsRunningTest(true);
    try {
      await performanceTest.runFullTestSuite();
      const results = await performanceTest.quickPerformanceCheck();
      setTestResults(results);
    } catch (error) {
      console.error('效能測試失敗:', error);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleClearCache = () => {
    performanceTest.resetTestEnvironment();
    setTestResults(null);
  };

  const handleShowCacheReport = () => {
    performanceMonitor.printCacheReport();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 摺疊按鈕 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-colors"
        title="效能監控面板"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* 展開的面板 */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">效能監控</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* 測試結果顯示 */}
          {testResults && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="flex items-center mb-2">
                <span className={`${getStatusColor(testResults.cacheStatus)} font-medium`}>
                  {getStatusIcon(testResults.cacheStatus)} 快取狀態: {testResults.cacheStatus}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>命中率: {testResults.hitRate.toFixed(1)}%</div>
                <div>效能提升: {testResults.averageImprovement.toFixed(1)}x</div>
                <div className="text-xs mt-2 p-2 bg-blue-50 rounded">
                  {testResults.recommendation}
                </div>
              </div>
            </div>
          )}

          {/* 控制按鈕 */}
          <div className="space-y-2">
            <button
              onClick={handleRunTest}
              disabled={isRunningTest}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded transition-colors"
            >
              {isRunningTest ? '執行中...' : '執行效能測試'}
            </button>

            <button
              onClick={handleShowCacheReport}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors"
            >
              顯示快取報告
            </button>

            <button
              onClick={handleClearCache}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition-colors"
            >
              清除快取
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>💡 提示: 開啟瀏覽器開發工具查看詳細日誌</p>
            <p>🚀 此面板僅在開發環境中顯示</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformancePanel;