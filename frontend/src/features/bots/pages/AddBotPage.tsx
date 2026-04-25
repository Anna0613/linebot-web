import BotCreationForm from "../components/BotCreationForm";
import AppShell from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/loader";
import React from "react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";

const AddBotPage = () => {
  const { user, loading, error } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login",
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
    <AppShell
      user={user}
      activeNav="create"
      headerKicker="Create Bot"
      innerClassName="max-w-5xl"
    >
      <div className="py-8">
        <BotCreationForm />
      </div>
    </AppShell>
  );
};

export default AddBotPage;
