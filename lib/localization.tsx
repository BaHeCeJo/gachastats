"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { LocalizedString } from "./localization-utils";

// Re-export type for convenience
export type { LocalizedString };

type LocalizationContextType = {
  currentLang: string;
  adminSelectedLang: string | null;
  setAdminSelectedLang: (lang: string | null) => void;
  displayLang: string;
};

type GameLocalizationContextType = {
  gameDefaultLang: string;
  gameSupportedLanguages: string[];
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);
const GameLocalizationContext = createContext<GameLocalizationContextType | undefined>(undefined);

// --- Client Component Provider ---
export function LocalizationProvider({ children, currentLang: initialLang }: { children: ReactNode; currentLang: string }) {
  const [adminSelectedLang, setAdminSelectedLang] = useState<string | null>(null);
  
  // Persist admin choice in session storage for better UX
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_preview_lang');
    if (saved) setAdminSelectedLang(saved);
  }, []);

  const handleSetAdminLang = (lang: string | null) => {
    setAdminSelectedLang(lang);
    if (lang) {
      sessionStorage.setItem('admin_preview_lang', lang);
    } else {
      sessionStorage.removeItem('admin_preview_lang');
    }
  };

  const displayLang = adminSelectedLang || initialLang;

  return (
    <LocalizationContext.Provider value={{ 
      currentLang: initialLang, 
      adminSelectedLang, 
      setAdminSelectedLang: handleSetAdminLang,
      displayLang 
    }}>
      {children}
    </LocalizationContext.Provider>
  );
}

// --- Client Component Hook for currentLang ---
export function useCurrentLanguage() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    return { currentLang: 'en', adminSelectedLang: null, setAdminSelectedLang: () => {}, displayLang: 'en' };
  }
  return context;
}

// --- Game-Specific Localization Provider ---
export function GameLocalizationProvider({
  children,
  gameDefaultLang,
  gameSupportedLanguages
}: {
  children: ReactNode;
  gameDefaultLang: string;
  gameSupportedLanguages: string[];
}) {
  return (
    <GameLocalizationContext.Provider value={{ gameDefaultLang, gameSupportedLanguages }}>
      {children}
    </GameLocalizationContext.Provider>
  );
}

// --- Client Component Hook for game-specific localization params ---
export function useGameLocalizationParams() {
  const context = useContext(GameLocalizationContext);
  if (context === undefined) {
    return { gameDefaultLang: 'en', gameSupportedLanguages: ['en'] }; // Fallback
  }
  return context;
}

/**
 * A client-side hook to get the current language, default language, and languages supported by the game.
 */
export function useLocalizationParams() {
  const { currentLang, adminSelectedLang, setAdminSelectedLang, displayLang } = useCurrentLanguage();
  const { gameDefaultLang, gameSupportedLanguages } = useGameLocalizationParams();

  return { currentLang, adminSelectedLang, setAdminSelectedLang, displayLang, gameDefaultLang, gameSupportedLanguages };
}

// Re-export logic function for client components that import from here
export { getTranslatedField, isMissingTranslation } from "./localization-utils";
