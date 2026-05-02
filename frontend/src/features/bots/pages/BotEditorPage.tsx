import React, { useRef, useState } from "react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import AppShell from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/loader";
import Mybot, { MybotRef } from "../components/Mybot";
import BotEditModal from "../components/BotEditModal";

const BotEditorPage = () => {
  const { user, loading, error } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login",
  });

  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState<"name" | "token" | "secret" | "all">(
    "name"
  );
  const mybotRef = useRef<MybotRef>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-background flex items-center justify-center">
        <div className="web3-glass-card p-8">
          <Loader text="載入中..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-background flex items-center justify-center">
        <div className="web3-glass-card p-8">
          <div className="text-web3-red text-lg">{error}</div>
        </div>
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
    <AppShell
      user={user}
      activeNav="editor"
      headerKicker="My Bots"
      innerClassName="max-w-5xl"
    >
      <div className="flex w-full justify-center py-8">
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
    </AppShell>
  );
};

export default BotEditorPage;
