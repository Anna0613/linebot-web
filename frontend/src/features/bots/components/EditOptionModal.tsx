import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelectedBot } from "@/features/bots/context/SelectedBotContext";

interface EditOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  onEditBasicInfo: () => void;
}

const EditOptionModal: React.FC<EditOptionModalProps> = ({
  isOpen,
  onClose,
  botId,
  onEditBasicInfo,
}) => {
  const navigate = useNavigate();
  const { selectBot } = useSelectedBot();

  if (!isOpen) return null;

  const handleEditFunction = () => {
    selectBot(botId);
    onClose();
    navigate("/bots/visual-editor", {
      state: {
        selectedBotId: botId,
        activeTab: "logic",
        returnTo: "/bots/management",
        returnLabel: "返回互動紀錄",
      },
    });
  };

  const handleEditBasicInfo = () => {
    selectBot(botId);
    onClose();
    onEditBasicInfo();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="app-panel w-full max-w-md p-0">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">選擇編輯類型</h3>
          <p className="mt-1 text-sm text-slate-500">選擇要調整的內容。</p>
        </div>

        {/* 選項按鈕 */}
        <div className="p-6 space-y-4">
          <button
            onClick={handleEditBasicInfo}
            className="group w-full rounded-[16px] border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/70"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#06C755]">
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
                <h4 className="font-medium text-slate-950 group-hover:text-[#166534]">
                  編輯基本資料
                </h4>
                <p className="text-sm text-slate-500">
                  修改 Bot 名稱、Token、Secret 等設定
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={handleEditFunction}
            className="group w-full rounded-[16px] border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/70"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#06C755]">
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
                <h4 className="font-medium text-slate-950 group-hover:text-[#166534]">
                  設計回覆
                </h4>
                <p className="text-sm text-slate-500">
                  設計 Bot 的回覆邏輯和流程
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOptionModal;
