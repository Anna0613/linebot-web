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
      <div className="app-page-surface flex min-h-screen items-center justify-center">
        <div className="app-panel max-w-md p-8 text-center">
          <h1 className="mb-4 text-2xl font-semibold text-rose-700">載入錯誤</h1>
          <p className="text-sm leading-6 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      user={user}
      activeNav="create"
      headerKicker="建立 Bot"
      innerClassName="max-w-5xl"
    >
      <div className="py-8">
        <BotCreationForm />
      </div>
    </AppShell>
  );
};

export default AddBotPage;
