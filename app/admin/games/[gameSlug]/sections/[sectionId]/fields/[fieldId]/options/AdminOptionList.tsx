"use client";

import Link from 'next/link';
import Image from 'next/image';
import { getTranslatedField, useLocalizationParams, LocalizedString } from "@/lib/localization";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import { getPublicUrl } from "@/lib/supabase/client";

type Option = {
  id: string;
  value_key: LocalizedString;
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
}: { 
  options: Option[], 
  gameSlug: string, 
  sectionId: string, 
  fieldId: string,
  gameDefaultLang: string
}) {
  const { displayLang, currentLang } = useLocalizationParams();
  const activeLang = displayLang || currentLang;

  return (
    <div className="grid gap-3">
      {options.map(opt => {
        const iconUrl = getPublicUrl('games', opt.icon_path);
        
        return (
          <Link
            key={opt.id}
            href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options/${opt.id}`}
            className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800 transition-colors"
            prefetch={false}
          >
            {iconUrl && (
              <div className="relative w-10 h-10 flex-shrink-0 bg-black/20 p-1 rounded">
                <Image
                  src={iconUrl}
                  fill
                  sizes="40px"
                  className="object-contain"
                  alt={getTranslatedField(opt.value_key, activeLang, gameDefaultLang)}
                />
              </div>
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
