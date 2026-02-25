"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { LocalizedString } from "./localization-utils";
import { uiTranslations, TranslationKey } from "./i18n/translations";

import { languages } from "./constants/languages";

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
  const [userSelectedLang, setUserSelectedLang] = useState<string | null>(null);
  
  // Persist admin choice in session storage for better UX
  useEffect(() => {
    const savedAdmin = sessionStorage.getItem('admin_preview_lang');
    if (savedAdmin) setAdminSelectedLang(savedAdmin);

    const savedUser = document.cookie.split('; ').find(row => row.startsWith('user_lang='))?.split('=')[1];
    if (savedUser) setUserSelectedLang(savedUser);
  }, []);

  const handleSetAdminLang = (lang: string | null) => {
    setAdminSelectedLang(lang);
    if (lang) {
      sessionStorage.setItem('admin_preview_lang', lang);
    } else {
      sessionStorage.removeItem('admin_preview_lang');
    }
  };

  const handleSetUserLang = (lang: string | null) => {
    setUserSelectedLang(lang);
    if (lang) {
      document.cookie = `user_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = `user_lang=; path=/; max-age=0`;
    }
    // Refresh the page to ensure server components update
    window.location.reload();
  };

  const displayLang = adminSelectedLang || userSelectedLang || initialLang;

  return (
    <LocalizationContext.Provider value={{ 
      currentLang: initialLang, 
      adminSelectedLang, 
      setAdminSelectedLang: handleSetAdminLang,
      displayLang 
    }}>
      <UserLocalizationContext.Provider value={{ userSelectedLang, setUserSelectedLang: handleSetUserLang }}>
        {children}
      </UserLocalizationContext.Provider>
    </LocalizationContext.Provider>
  );
}

const UserLocalizationContext = createContext<{
  userSelectedLang: string | null;
  setUserSelectedLang: (lang: string | null) => void;
} | undefined>(undefined);

export function useUserLocalization() {
  const context = useContext(UserLocalizationContext);
  if (context === undefined) {
    return { userSelectedLang: null, setUserSelectedLang: () => {} };
  }
  return context;
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
  const { currentLang, adminSelectedLang, setAdminSelectedLang, displayLang: rawDisplayLang } = useCurrentLanguage();
  const { gameDefaultLang, gameSupportedLanguages } = useGameLocalizationParams();
  const { userSelectedLang, setUserSelectedLang } = useUserLocalization();

  // Ensure the displayed language is actually supported by the current game context
  // (This respects the "Ready" languages logic passed from the server)
  const isSupported = (lang: string | null) => lang && gameSupportedLanguages.includes(lang);
  
  const displayLang = adminSelectedLang || (isSupported(userSelectedLang) ? userSelectedLang : (isSupported(currentLang) ? currentLang : gameDefaultLang));

  const t = useCallback((key: TranslationKey): string => {
    const lang = displayLang || 'en';
    const translation = uiTranslations[lang]?.[key] || uiTranslations['en']?.[key] || key;
    return translation;
  }, [displayLang]);

  const isRtl = languages.find(l => l.code === displayLang)?.isRtl || false;

  const fn = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return formatNumber(value, displayLang, options);
  }, [displayLang]);

  const fd = useCallback((date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
    return formatDate(date, displayLang, options);
  }, [displayLang]);

  return { 
    currentLang, 
    adminSelectedLang, 
    setAdminSelectedLang, 
    displayLang, 
    gameDefaultLang, 
    gameSupportedLanguages, 
    t, 
    userSelectedLang, 
    setUserSelectedLang, 
    isRtl,
    formatNumber: fn,
    formatDate: fd
  };
}

// Re-export logic function for client components that import from here
export { getTranslatedField, isMissingTranslation, formatNumber, formatDate } from "./localization-utils";
