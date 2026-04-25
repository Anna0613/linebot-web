export type AppLanguage = "en" | "zh";

export const LANGUAGE_STORAGE_KEY = "linebot-web-language";
export const LANGUAGE_CHANGE_EVENT = "linebot-web-language-change";

export const normalizeLanguage = (value?: string | null): AppLanguage =>
  value === "zh" || value === "zh-TW" || value === "zh-Hant" ? "zh" : "en";

export const getStoredLanguagePreference = (): AppLanguage => {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) {
      return normalizeLanguage(stored);
    }
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }

  return "en";
};

export const applyLanguagePreference = (language: AppLanguage) => {
  try {
    document.documentElement.setAttribute(
      "lang",
      language === "zh" ? "zh-TW" : "en"
    );
  } catch {
    // Ignore document access errors during early bootstrap.
  }
};

export const setStoredLanguagePreference = (language: AppLanguage) => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Keep the in-memory UI update even if persistence fails.
  }

  applyLanguagePreference(language);
  window.dispatchEvent(
    new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language } })
  );
};
