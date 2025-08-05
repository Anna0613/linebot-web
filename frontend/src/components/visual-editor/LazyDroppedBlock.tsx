import React, { Suspense, lazy } from 'react';

// 延遲載入 DroppedBlock 組件
const DroppedBlock = lazy(() => import('./DroppedBlock'));

// 骨架屏組件
const BlockSkeleton: React.FC = () => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="flex space-x-2">
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full"></div>
      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
    </div>
  </div>
);

// 錯誤邊界組件
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyBlockErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyDroppedBlock 載入錯誤:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center text-red-600 mb-2">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            積木載入失敗
          </div>
          <p className="text-sm text-red-600">
            {this.state.error?.message || '未知錯誤'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            重新載入頁面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 延遲載入的積木組件接口
interface LazyDroppedBlockProps {
  block: {
    blockType: string;
    blockData: { [key: string]: unknown };
  };
  index: number;
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, data: { [key: string]: unknown }) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
  onInsert?: (index: number, item: { 
    blockType: string; 
    blockData: { [key: string]: unknown } 
  }) => void;
}

/**
 * 延遲載入的積木組件
 * 使用 React.lazy 和 Suspense 來提升初始載入性能
 */
const LazyDroppedBlock: React.FC<LazyDroppedBlockProps> = (props) => {
  return (
    <LazyBlockErrorBoundary>
      <Suspense fallback={<BlockSkeleton />}>
        <DroppedBlock {...props} />
      </Suspense>
    </LazyBlockErrorBoundary>
  );
};

export default LazyDroppedBlock;