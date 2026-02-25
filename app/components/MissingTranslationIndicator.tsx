"use client";

import { useLocalizationParams, LocalizedString } from "@/lib/localization";
import { getMissingLanguages } from "@/lib/localization-utils";

type Props = {
  value: LocalizedString | string | null | undefined;
};

export default function MissingTranslationIndicator({ value }: Props) {
  const { gameSupportedLanguages } = useLocalizationParams() as any;

  if (!gameSupportedLanguages || gameSupportedLanguages.length === 0) return null;

  const missingLangs = getMissingLanguages(value, gameSupportedLanguages);

  if (missingLangs.length === 0) return null;

  const title = `Missing translations for: ${missingLangs.map(l => l.toUpperCase()).join(", ")}`;

  return (
    <span 
      className="inline-flex items-center justify-center p-1 bg-amber-500/20 border border-amber-500/50 rounded-md text-amber-500 hover:bg-amber-500/30 transition-colors cursor-help group relative"
      title={title}
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

      {/* Optional custom tooltip if the browser title isn't enough */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded shadow-xl border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
        {title}
      </div>
    </span>
  );
}
