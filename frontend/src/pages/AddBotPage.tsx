import BotCreationForm from "../components/forms/BotCreationForm";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import { Loader } from "@/components/ui/loader";
import React from "react";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";

const AddBotPage = () => {
  const { user, loading, error } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login"
  });

  if (loading) {
    return <Loader fullPage={true} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-background flex items-center justify-center">
        <div className="web3-glass-card p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">載入錯誤</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent dark:bg-background">
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
