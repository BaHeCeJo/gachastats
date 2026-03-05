"use client";

import { createContext, useContext, ReactNode, useState, useCallback, useEffect, useMemo } from "react";
import { formatNumber as fnUtils, formatDate as fdUtils } from "./localization-utils";
import { uiTranslations, UITranslationKey } from "./i18n/translations";

type LocalizationContextType = {
  currentLang: string;
  adminSelectedLang: string | null;
  userSelectedLang: string | null;
  setAdminSelectedLang: (lang: string | null) => void;
  setUserSelectedLang: (lang: string | null) => void;
  displayLang: string;
  t: (key: UITranslationKey) => string;
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (d: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  gameDefaultLang: string;
  gameSupportedLanguages: string[];
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

/**
 * Common logic for translation and formatting based on a given language code.
 */
function useLocalizationCore(displayLang: string) {
  const t = useCallback((key: UITranslationKey): string => {
    const translations = uiTranslations[displayLang as keyof typeof uiTranslations] || uiTranslations.en;
    return translations[key] || uiTranslations.en[key] || key;
  }, [displayLang]);

  const formatNumber = useCallback((n: number, options?: Intl.NumberFormatOptions) => 
    fnUtils(n, displayLang, options), [displayLang]);
    
  const formatDate = useCallback((d: Date | string, options?: Intl.DateTimeFormatOptions) => 
    fdUtils(d, displayLang, options), [displayLang]);

  return { t, formatNumber, formatDate };
}

export function LocalizationProvider({ 
  children, 
  currentLang: initialLang 
}: { 
  children: ReactNode;
  currentLang: string;
}) {
  const [adminSelectedLang, setAdminSelectedLangState] = useState<string | null>(null);
  const [userSelectedLang, setUserSelectedLangState] = useState<string | null>(null);

  // Use a lazy initializer for isMounted to avoid triggering an immediate re-render if possible,
  // but for hydration safety, we must start at false and move to true.
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const savedAdminLang = sessionStorage.getItem('admin_preview_lang') || null;
    if (savedAdminLang) setAdminSelectedLangState(savedAdminLang);

    const cookies = document.cookie.split('; ');
    const userLangCookie = cookies.find(row => row.startsWith('user_lang='))?.split('=')[1] || null;
    if (userLangCookie) setUserSelectedLangState(userLangCookie);
  }, []);

  const displayLang = useMemo(() => {
    // During SSR and first mount, use initialLang
    if (!isMounted) return initialLang || 'en';
    // After mount, we can use client-side state
    return adminSelectedLang || userSelectedLang || initialLang || 'en';
  }, [isMounted, adminSelectedLang, userSelectedLang, initialLang]);

  const { t, formatNumber, formatDate } = useLocalizationCore(displayLang);

  const setAdminSelectedLang = useCallback((lang: string | null) => {
    setAdminSelectedLangState(lang);
    if (typeof window !== 'undefined') {
      if (lang) sessionStorage.setItem('admin_preview_lang', lang);
      else sessionStorage.removeItem('admin_preview_lang');
    }
  }, []);

  const setUserSelectedLang = useCallback((lang: string | null) => {
    setUserSelectedLangState(lang);
    if (typeof document !== 'undefined') {
      if (lang) {
        document.cookie = `user_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        document.cookie = `user_lang=; path=/; max-age=0`;
      }
    }
  }, []);

  const value = {
    currentLang: initialLang,
    adminSelectedLang,
    userSelectedLang,
    setAdminSelectedLang,
    setUserSelectedLang,
    displayLang,
    t,
    formatNumber,
    formatDate,
    gameDefaultLang: 'en',
    gameSupportedLanguages: ['en']
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function GameLocalizationProvider({ 
  children,
  gameDefaultLang,
  gameSupportedLanguages 
}: { 
  children: ReactNode;
  gameDefaultLang: string;
  gameSupportedLanguages: string[];
}) {
  const base = useLocalizationParams();
  
  const displayLang = useMemo(() => {
    return gameSupportedLanguages.includes(base.displayLang) 
      ? base.displayLang 
      : gameDefaultLang;
  }, [base.displayLang, gameSupportedLanguages, gameDefaultLang]);

  const { t, formatNumber, formatDate } = useLocalizationCore(displayLang);

  const value = {
    ...base,
    displayLang,
    t,
    formatNumber,
    formatDate,
    gameDefaultLang,
    gameSupportedLanguages
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalizationParams() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    const displayLang = 'en';
    const t = (key: UITranslationKey) => uiTranslations.en[key] || key;
    const formatNumber = (n: number, options?: Intl.NumberFormatOptions) => fnUtils(n, displayLang, options);
    const formatDate = (d: Date | string, options?: Intl.DateTimeFormatOptions) => fdUtils(d, displayLang, options);
    
    return {
      currentLang: 'en',
      adminSelectedLang: '',
      userSelectedLang: null,
      setAdminSelectedLang: () => {},
      setUserSelectedLang: () => {},
      displayLang,
      t,
      formatNumber,
      formatDate,
      gameDefaultLang: 'en',
      gameSupportedLanguages: ['en']
    };
  }
  return context;
}

export { getTranslatedField, isMissingTranslation, formatNumber, formatDate, type LocalizedString } from "./localization-utils";
