import React from 'react';
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface CustomAlertProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isOpen: boolean;
  onClose: () => void;
}

export function CustomAlert({ message, type, isOpen, onClose }: CustomAlertProps) {
  if (!isOpen) return null;

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    info: <AlertCircle className="w-5 h-5 text-blue-600" />
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className={`relative p-6 rounded-lg shadow-lg border ${colors[type]} max-w-sm w-full mx-4`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          <div className="ml-3 w-full">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex-shrink-0 -mx-1.5 -my-1.5 p-1.5 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-300"
          >
            <span className="sr-only">關閉</span>
            <XCircle className="w-5 h-5 opacity-50 hover:opacity-100" />
          </button>
        </div>
      </div>
    </div>
  );
}
