import { uiTranslations, TranslationKey } from "./i18n/translations";

export type LocalizedString = {
  [langCode: string]: string;
};

/**
 * Helper for server components to get translations.
 */
export function getTranslation(key: TranslationKey, lang: string): string {
  const translation = uiTranslations[lang]?.[key] || uiTranslations['en']?.[key] || key;
  return translation;
}

/**
 * Retrieves the translated string from a LocalizedString object.
 * Falls back to a default language if the preferred language is not available.
 */
export function getTranslatedField(
  localizedString: LocalizedString | string | null | undefined,
  preferredLang: string,
  defaultLang: string
): string {
  if (!localizedString) {
    return "";
  }

  if (typeof localizedString === "string") {
    return localizedString;
  }

  if (localizedString[preferredLang]) {
    return localizedString[preferredLang];
  }

  if (localizedString[defaultLang]) {
    return localizedString[defaultLang];
  }

  const firstAvailableLang = Object.keys(localizedString)[0];
  if (firstAvailableLang) {
    return (localizedString as LocalizedString)[firstAvailableLang];
  }

  return "";
}

/**
 * Checks if a LocalizedString is missing a value for a specific language.
 */
export function isMissingTranslation(
  localizedString: LocalizedString | string | null | undefined,
  langCode: string
): boolean {
  if (!localizedString) return true;
  if (typeof localizedString === "string") return false; // If it's a string, it's considered "translated" (though maybe only in one language)
  
  return !localizedString[langCode] || localizedString[langCode].trim() === "";
}

/**
 * Returns a list of language codes that are missing translations in a LocalizedString.
 */
export function getMissingLanguages(
  localizedString: LocalizedString | string | null | undefined,
  supportedLangs: string[]
): string[] {
  if (!localizedString || typeof localizedString === "string") {
    return []; // If it's a string, we can't check other languages here
  }
  
  return supportedLangs.filter(lang => !localizedString[lang] || localizedString[lang].trim() === "");
}
