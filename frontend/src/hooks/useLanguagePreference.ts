import { useCallback, useEffect, useState } from "react";
import {
  AppLanguage,
  applyLanguagePreference,
  getStoredLanguagePreference,
  LANGUAGE_CHANGE_EVENT,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  setStoredLanguagePreference,
} from "@/utils/languagePreference";

export const useLanguagePreference = () => {
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    getStoredLanguagePreference()
  );

  useEffect(() => {
    applyLanguagePreference(language);

    const handleLanguageChange = (event: Event) => {
      const nextLanguage = normalizeLanguage(
        (event as CustomEvent<{ language?: string }>).detail?.language
      );
      setLanguageState(nextLanguage);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        setLanguageState(normalizeLanguage(event.newValue));
      }
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    setStoredLanguagePreference(nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "zh" : "en");
  }, [language, setLanguage]);

  return {
    language,
    setLanguage,
    toggleLanguage,
    isChinese: language === "zh",
  };
};
