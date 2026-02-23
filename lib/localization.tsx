"use client";

import { createContext, useContext, ReactNode } from "react";
import { LocalizedString } from "./localization-utils";

// Re-export type for convenience
export type { LocalizedString };

type LocalizationContextType = {
  currentLang: string;
};

type GameLocalizationContextType = {
  gameDefaultLang: string;
  gameSupportedLanguages: string[];
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);
const GameLocalizationContext = createContext<GameLocalizationContextType | undefined>(undefined);

// --- Client Component Provider ---
export function LocalizationProvider({ children, currentLang }: { children: ReactNode; currentLang: string }) {
  return (
    <LocalizationContext.Provider value={{ currentLang }}>
      {children}
    </LocalizationContext.Provider>
  );
}

// --- Client Component Hook for currentLang ---
export function useCurrentLanguage() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    return { currentLang: 'en' };
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
  const { currentLang } = useCurrentLanguage();
  const { gameDefaultLang, gameSupportedLanguages } = useGameLocalizationParams();

  return { currentLang, gameDefaultLang, gameSupportedLanguages };
}

// Re-export logic function for client components that import from here
export { getTranslatedField } from "./localization-utils";
