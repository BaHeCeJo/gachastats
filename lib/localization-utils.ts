// lib/localization-utils.ts

export type LocalizedString = {
  [langCode: string]: string;
};

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
