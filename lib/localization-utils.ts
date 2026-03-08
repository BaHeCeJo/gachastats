import { uiTranslations, UITranslationKey } from "./i18n/translations";

export type LocalizedString = {
  [langCode: string]: string;
};

/**
 * Safely accesses a property on a localized object to prevent Object Injection.
 * Ultra-Secure Version (Level 2): Enforces whitelist-only patterns.
 */
export function safeGet(obj: Record<string, unknown> | null | undefined, key: string): string | null {
  // 1. Basic Type Guard
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

  // 2. Format Hardening (Whitelist)
  // Max length 64, only allow Alphanumeric, underscores, hyphens, and dots (for nested keys if needed)
  // This prevents massive payload attacks or control character injection.
  if (key.length > 64 || !/^[a-zA-Z0-9._-]+$/.test(key)) return null;

  // 3. Prototype Shield (Case Insensitive)
  const forbidden = ['__proto__', 'constructor', 'prototype'];
  if (forbidden.includes(key.toLowerCase())) return null;
  
  // 4. Ownership Verification
  // We use the prototype method directly to ensure it hasn't been hijacked.
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    // eslint-disable-next-line security/detect-object-injection
    const val = obj[key];
    // 5. Strict Type Enforcement
    return typeof val === 'string' ? val : null;
  }

  return null;
}

/**
 * Helper for server components to get translations.
 */
export function getTranslation(key: UITranslationKey, lang: string): string {
  const translations = Object.prototype.hasOwnProperty.call(uiTranslations, lang) 
    ? uiTranslations[lang as keyof typeof uiTranslations] 
    : uiTranslations.en;
    
  return safeGet(translations as unknown as Record<string, string>, key) || safeGet(uiTranslations.en as unknown as Record<string, string>, key) || key;
}

export type LocalizedValue = LocalizedString | string | null | undefined;

/**
 * Retrieves the translated string from a LocalizedString object.
 * Falls back to a default language if the preferred language is not available.
 */
export function getTranslatedField(
  localizedString: LocalizedValue,
  preferredLang: string,
  defaultLang: string
): string {
  if (!localizedString) return "";
  if (typeof localizedString === "string") return localizedString;

  return safeGet(localizedString as Record<string, string>, preferredLang) || 
         safeGet(localizedString as Record<string, string>, defaultLang) || 
         "";
}

/**
 * Checks if a LocalizedString is missing a value for a specific language.
 */
export function isMissingTranslation(
  localizedString: LocalizedValue,
  langCode: string
): boolean {
  if (!localizedString) return true;
  if (typeof localizedString === "string") return false;
  
  const val = safeGet(localizedString as Record<string, string>, langCode);
  return !val || val.trim() === "";
}

/**
 * Returns an array of language codes that are missing translations.
 */
export function getMissingLanguages(
  value: LocalizedValue,
  supportedLanguages: string[]
): string[] {
  if (!value) return supportedLanguages;
  if (typeof value === "string") return [];

  return supportedLanguages.filter(lang => isMissingTranslation(value, lang));
}

/**
 * Formats a number according to the specified language.
 */
export function formatNumber(n: number, lang: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(lang, options).format(n);
}

/**
 * Formats a date according to the specified language.
 */
export function formatDate(date: Date | string | number, lang: string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(lang, options).format(d);
}
