"use client";

import { useLocalizationParams, TranslationKey } from "@/lib/localization";

export default function UIStringsProvider({ 
  children 
}: { 
  children: (t: (key: TranslationKey) => string) => React.ReactNode 
}) {
  const { t } = useLocalizationParams() as any;
  return <>{children(t)}</>;
}
