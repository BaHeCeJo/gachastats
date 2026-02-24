"use client";

import { useLocalizationParams, isMissingTranslation, LocalizedString } from "@/lib/localization";

type Props = {
  value: LocalizedString | string | null | undefined;
  lang?: string; // Optional: check a specific lang instead of displayLang
};

export default function MissingTranslationIndicator({ value, lang }: Props) {
  const { displayLang } = useLocalizationParams() as any;
  const targetLang = lang || displayLang;

  const missing = isMissingTranslation(value, targetLang);

  if (!missing || !targetLang) return null;

  return (
    <span 
      className="inline-flex items-center justify-center p-1 bg-amber-500/20 border border-amber-500/50 rounded-md text-amber-500 hover:bg-amber-500/30 transition-colors cursor-help"
      title={`Missing translation for ${targetLang.toUpperCase()}`}
    >
      <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="m5 8 6 6" />
        <path d="m4 14 6-6 2-3" />
        <path d="M2 5h12" />
        <path d="M7 2h1" />
        <path d="m22 22-5-10-5 10" />
        <path d="M14 18h6" />
      </svg>
    </span>
  );
}
