import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { apiClient } from "@/services/UnifiedApiClient";
import { Bot } from "@/types/bot";

const SELECTED_BOT_STORAGE_KEY = "botlyn-selected-bot-id";
const SELECTED_BOT_CHANGE_EVENT = "botlyn-selected-bot-change";

type SelectedBotContextValue = {
  bots: Bot[];
  selectedBotId: string;
  selectedBot?: Bot;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  selectBot: (botId: string) => void;
  clearSelectedBot: () => void;
  refreshBots: () => Promise<Bot[]>;
};

const SelectedBotContext = createContext<SelectedBotContextValue | undefined>(
  undefined
);

const readStoredSelectedBotId = () => {
  try {
    return window.localStorage.getItem(SELECTED_BOT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

const writeStoredSelectedBotId = (botId: string) => {
  try {
    if (botId) {
      window.localStorage.setItem(SELECTED_BOT_STORAGE_KEY, botId);
    } else {
      window.localStorage.removeItem(SELECTED_BOT_STORAGE_KEY);
    }

    window.dispatchEvent(
      new CustomEvent(SELECTED_BOT_CHANGE_EVENT, { detail: { botId } })
    );
  } catch {
    // localStorage can be unavailable in restricted browsing contexts.
  }
};

export const SelectedBotProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>(
    readStoredSelectedBotId
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<Bot[]> | null>(null);

  const selectBot = useCallback((botId: string) => {
    setSelectedBotId(botId);
    writeStoredSelectedBotId(botId);
  }, []);

  const clearSelectedBot = useCallback(() => {
    selectBot("");
  }, [selectBot]);

  const refreshBots = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    setIsLoading(true);
    setError(null);

    const request = (async () => {
      const response = await apiClient.getBots();

      if (response.error) {
        throw new Error(response.error);
      }

      const nextBots = Array.isArray(response.data)
        ? (response.data as Bot[])
        : [];

      setBots(nextBots);
      setSelectedBotId((currentBotId) => {
        const storedBotId = readStoredSelectedBotId();
        const candidateBotId = currentBotId || storedBotId;
        const candidateStillExists = nextBots.some(
          (bot) => bot.id === candidateBotId
        );

        if (candidateBotId && candidateStillExists) {
          writeStoredSelectedBotId(candidateBotId);
          return candidateBotId;
        }

        const fallbackBotId = nextBots[0]?.id || "";
        writeStoredSelectedBotId(fallbackBotId);
        return fallbackBotId;
      });
      setHasLoaded(true);
      return nextBots;
    })();

    refreshPromiseRef.current = request;

    try {
      return await request;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "無法載入 LINE Bot 列表";
      setError(message);
      setBots([]);
      setHasLoaded(true);
      return [];
    } finally {
      refreshPromiseRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const selectedBot = useMemo(
    () => bots.find((bot) => bot.id === selectedBotId),
    [bots, selectedBotId]
  );

  const value = useMemo(
    () => ({
      bots,
      selectedBotId,
      selectedBot,
      isLoading,
      hasLoaded,
      error,
      selectBot,
      clearSelectedBot,
      refreshBots,
    }),
    [
      bots,
      selectedBotId,
      selectedBot,
      isLoading,
      hasLoaded,
      error,
      selectBot,
      clearSelectedBot,
      refreshBots,
    ]
  );

  return (
    <SelectedBotContext.Provider value={value}>
      {children}
    </SelectedBotContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSelectedBot = () => {
  const context = useContext(SelectedBotContext);

  if (!context) {
    throw new Error("useSelectedBot must be used within SelectedBotProvider");
  }

  return context;
};
