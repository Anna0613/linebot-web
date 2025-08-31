import BotCreationForm from "../components/forms/BotCreationForm";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import React from "react";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";

const AddBotPage = () => {
  const { user, loading, error } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login"
  });

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

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar user={user} />
      <main className="flex-1">
      <div className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <BotCreationForm />
          </div>
        </div>
      </main>
      <DashboardFooter />
    </div>
  );
};

export default AddBotPage;
