import React from 'react';
import { Save, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { SaveStatus } from '../../types/saveStatus';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSavedTime?: Date;
  errorMessage?: string;
  className?: string;
}

const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  status,
  lastSavedTime,
  errorMessage,
  className = ''
}) => {
  const getStatusDisplay = () => {
    switch (status) {
      case SaveStatus.SAVED:
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: '已儲存',
          textClass: 'text-green-700',
          bgClass: 'bg-green-50 border-green-200'
        };
      case SaveStatus.PENDING:
        return {
          icon: <Clock className="w-4 h-4 text-yellow-600" />,
          text: '有未儲存變更',
          textClass: 'text-yellow-700',
          bgClass: 'bg-yellow-50 border-yellow-200'
        };
      case SaveStatus.SAVING:
        return {
          icon: <Save className="w-4 h-4 text-blue-600 animate-pulse" />,
          text: '儲存中...',
          textClass: 'text-blue-700',
          bgClass: 'bg-blue-50 border-blue-200'
        };
      case SaveStatus.ERROR:
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-600" />,
          text: '儲存失敗',
          textClass: 'text-red-700',
          bgClass: 'bg-red-50 border-red-200'
        };
      default:
        return {
          icon: <Save className="w-4 h-4 text-gray-600" />,
          text: '未知狀態',
          textClass: 'text-gray-700',
          bgClass: 'bg-gray-50 border-gray-200'
        };
    }
  };

  const { icon, text, textClass, bgClass } = getStatusDisplay();

  const formatLastSavedTime = (time: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) {
      return '剛剛';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} 分鐘前`;
    } else if (diffHours < 24) {
      return `${diffHours} 小時前`;
    } else {
      return time.toLocaleDateString('zh-TW', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg border ${bgClass} ${className}`}>
      {icon}
      <span className={`text-sm font-medium ${textClass}`}>
        {text}
      </span>
      
      {status === SaveStatus.SAVED && lastSavedTime && (
        <span className="text-xs text-gray-500">
          ({formatLastSavedTime(lastSavedTime)})
        </span>
      )}
      
      {status === SaveStatus.ERROR && errorMessage && (
        <span 
          className="text-xs text-red-600 cursor-help" 
          title={errorMessage}
        >
          (詳情)
        </span>
      )}
    </div>
  );
};

export default SaveStatusIndicator;