import React, { useRef, useState } from "react";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import Navbar3 from "../components/Panels/Navbar3";
import DashboardFooter from "../components/layout/DashboardFooter";
import Mybot, { MybotRef } from "@/components/Editbot/Mybot";
import BotEditModal from "../components/Editbot/BotEditModal";

const BotEditorPage = () => {
  const { user, loading, error } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login"
  });

  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState<"name" | "token" | "secret" | "all">("name");
  const mybotRef = useRef<MybotRef>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-[#5A2C1D] text-lg loading-pulse">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );
  }

  // 直接處理編輯請求
  const handleEdit = (
    botId: string,
    editType: "name" | "token" | "secret" | "all"
  ) => {
    setEditingBotId(botId);
    setEditType(editType);
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingBotId(null);
  };

  const handleBotUpdated = () => {
    // 重新載入Bot列表
    if (mybotRef.current && mybotRef.current.refreshBots) {
      mybotRef.current.refreshBots();
    }
    // 關閉模態框和重置狀態
    setShowEditModal(false);
    setEditingBotId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar3 user={user} />
      <main className="pt-24 sm:pt-28 md:pt-32 flex flex-col items-center flex-1">
        <div className="w-full max-w-7xl px-4 sm:px-6 mb-16 sm:mb-20 md:mb-24 flex justify-center items-start">
          <div className="w-full max-w-4xl">
            <Mybot onEdit={handleEdit} ref={mybotRef} />
          </div>

          {/* 編輯模態框 */}
          {showEditModal && editingBotId && (
            <BotEditModal
              isOpen={showEditModal}
              onClose={handleEditModalClose}
              botId={editingBotId}
              editType={editType}
              onBotUpdated={handleBotUpdated}
            />
          )}
        </div>
      </main>
      <DashboardFooter />
    </div>
  );
};

export default BotEditorPage;
