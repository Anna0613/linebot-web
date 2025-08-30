import React from "react";
import { useNavigate } from "react-router-dom";

interface EditOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  onEditBasicInfo: () => void;
}

const EditOptionModal: React.FC<EditOptionModalProps> = ({
  isOpen,
  onClose,
  botId: _botId,
  onEditBasicInfo,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleEditFunction = () => {
    onClose();
    navigate("/bots/editor");
  };

  const handleEditBasicInfo = () => {
    onClose();
    onEditBasicInfo();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 標題 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-foreground">選擇編輯類型</h3>
          <p className="text-sm text-gray-600 mt-1">請選擇您要編輯的內容</p>
        </div>

        {/* 選項按鈕 */}
        <div className="p-6 space-y-4">
          <button
            onClick={handleEditBasicInfo}
            className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="font-medium text-foreground group-hover:text-[hsl(var(--primary))]">
                  編輯基本資料
                </h4>
                <p className="text-sm text-muted-foreground">
                  修改Bot名稱、Token、Secret等設定
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={handleEditFunction}
            className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="font-medium text-foreground group-hover:text-[hsl(var(--primary))]">
                  編輯功能
                </h4>
                <p className="text-sm text-muted-foreground">
                  設計Bot的回應邏輯和功能流程
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* 底部按鈕 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] rounded-md font-bold hover:opacity-90 transition-all duration-200"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOptionModal;
