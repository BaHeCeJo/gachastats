"use client";

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react";
import { formatNumber, formatDate } from "./localization-utils";
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

export function LocalizationProvider({ 
  children, 
  currentLang: initialLang 
}: { 
  children: ReactNode;
  currentLang: string;
}) {
  const [adminSelectedLang, setAdminSelectedLangState] = useState<string | null>(null);
  const [userSelectedLang, setUserSelectedLangState] = useState<string | null>(null);
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

  // During hydration, we must use the initialLang from server to match HTML
  const displayLang = isMounted 
    ? (adminSelectedLang || userSelectedLang || initialLang || 'en')
    : (initialLang || 'en');

  const t = useCallback((key: UITranslationKey): string => {
    const translations = uiTranslations[displayLang as keyof typeof uiTranslations] || uiTranslations.en;
    return translations[key] || uiTranslations.en[key] || key;
  }, [displayLang]);

  const fn = useCallback((n: number, options?: Intl.NumberFormatOptions) => 
    formatNumber(n, displayLang, options), [displayLang]);
    
  const fd = useCallback((d: Date | string, options?: Intl.DateTimeFormatOptions) => 
    formatDate(d, displayLang, options), [displayLang]);

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
    formatNumber: fn,
    formatDate: fd,
    gameDefaultLang: 'en',
    gameSupportedLanguages: ['en']
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

// Separate provider for Game-specific logic
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
  
  // Logic here should also be hydration-safe
  const rawDisplayLang = base.displayLang;
  const displayLang = gameSupportedLanguages.includes(rawDisplayLang) 
    ? rawDisplayLang 
    : gameDefaultLang;

  const t = useCallback((key: UITranslationKey): string => {
    const translations = uiTranslations[displayLang as keyof typeof uiTranslations] || uiTranslations.en;
    return translations[key] || uiTranslations.en[key] || key;
  }, [displayLang]);

  const fn = useCallback((n: number, options?: Intl.NumberFormatOptions) => 
    formatNumber(n, displayLang, options), [displayLang]);
    
  const fd = useCallback((d: Date | string, options?: Intl.DateTimeFormatOptions) => 
    formatDate(d, displayLang, options), [displayLang]);

  const value = {
    ...base,
    displayLang,
    t,
    formatNumber: fn,
    formatDate: fd,
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
    const fn = (n: number, options?: Intl.NumberFormatOptions) => formatNumber(n, displayLang, options);
    const fd = (d: Date | string, options?: Intl.DateTimeFormatOptions) => formatDate(d, displayLang, options);
    
    return {
      currentLang: 'en',
      adminSelectedLang: '',
      userSelectedLang: null,
      setAdminSelectedLang: () => {},
      setUserSelectedLang: () => {},
      displayLang,
      t,
      formatNumber: fn,
      formatDate: fd,
      gameDefaultLang: 'en',
      gameSupportedLanguages: ['en']
    };
  }
  return context;
}

export { getTranslatedField, isMissingTranslation, formatNumber, formatDate, type LocalizedString } from "./localization-utils";
