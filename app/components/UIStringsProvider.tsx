"use client";

import { useLocalizationParams } from "@/lib/localization";
import { UITranslationKey } from "@/lib/i18n/translations";

export default function UIStringsProvider({ 
  children 
}: { 
  children: (t: (key: UITranslationKey) => string) => React.ReactNode 
}) {
  const { t } = useLocalizationParams();
  return <>{children(t)}</>;
}
