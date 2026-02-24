"use client";

import Link from 'next/link';
import { getTranslatedField, useLocalizationParams } from "@/lib/localization";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';

type Option = {
  id: string;
  value_key: any;
  icon_path: string | null;
  color: string | null;
  order_index: number;
};

export default function AdminOptionList({ 
  options, 
  gameSlug, 
  sectionId, 
  fieldId, 
  gameDefaultLang,
  supabaseUrl
}: { 
  options: Option[], 
  gameSlug: string, 
  sectionId: string, 
  fieldId: string,
  gameDefaultLang: string,
  supabaseUrl: string
}) {
  const { displayLang, currentLang } = useLocalizationParams() as any;
  const activeLang = displayLang || currentLang;

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    return `${supabaseUrl}/storage/v1/object/public/games/${path}`;
  };

  return (
    <div className="grid gap-3">
      {options.map(opt => {
        const iconUrl = getPublicUrl(opt.icon_path || "");
        
        return (
          <Link
            key={opt.id}
            href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options/${opt.id}`}
            className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800 transition-colors"
            prefetch={false}
          >
            {iconUrl && (
              <img
                src={iconUrl}
                className="w-10 h-10 object-contain rounded bg-black/20 p-1"
                alt={getTranslatedField(opt.value_key, activeLang, gameDefaultLang)}
              />
            )}

            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {getTranslatedField(opt.value_key, activeLang, gameDefaultLang)}
              </span>
              <MissingTranslationIndicator value={opt.value_key} />
            </div>

            {opt.color && (
              <span
                className="ml-auto w-5 h-5 rounded-full border border-white/10 shadow-inner"
                style={{ backgroundColor: opt.color }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
