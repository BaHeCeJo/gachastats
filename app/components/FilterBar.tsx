"use client";

import Image from "next/image";
import { LocalizedString, getTranslatedField } from "@/lib/localization";

type Option = {
  id: string;
  value_key: LocalizedString;
  iconUrl?: string;
  color?: string;
};

type FilterField = {
  id: string;
  key: LocalizedString;
  options: Option[];
};

interface FilterBarProps {
  filterFields: FilterField[];
  activeFilters: Record<string, string>;
  onToggleFilter: (fieldId: string, value: string) => void;
  currentLang: string;
  gameDefaultLang: string;
}

export function FilterBar({
  filterFields,
  activeFilters,
  onToggleFilter,
  currentLang,
  gameDefaultLang,
}: FilterBarProps) {
  if (filterFields.length === 0) return null;

  return (
    <div className="space-y-6 bg-zinc-800/40 p-8 rounded-[2rem] border border-zinc-700/50">
      {filterFields.map((field) => (
        <div key={field.id} className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {getTranslatedField(field.key, currentLang, gameDefaultLang)}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {field.options.map((opt) => {
              const isActive = activeFilters[field.id] === opt.id;
              const displayValue = getTranslatedField(opt.value_key, currentLang, gameDefaultLang);
              return (
                <button
                  key={opt.id}
                  onClick={() => onToggleFilter(field.id, opt.id)}
                  className={`
                    relative flex items-center justify-center transition-all duration-300
                    ${opt.iconUrl ? "w-14 h-14 rounded-xl p-1.5" : "px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"}
                    ${isActive 
                      ? "bg-[#22c55e] text-black shadow-[0_0_25px_rgba(34,197,94,0.4)] scale-105" 
                      : "bg-zinc-700/30 hover:bg-zinc-600/50 text-zinc-300 border border-zinc-700 hover:border-zinc-500"}
                  `}
                >
                  {opt.iconUrl ? (
                    <div className="relative w-full h-full">
                      <Image 
                        src={opt.iconUrl} 
                        alt={displayValue} 
                        fill
                        sizes="56px"
                        className={`object-contain ${isActive ? "brightness-0" : ""}`} 
                      />
                    </div>
                  ) : (
                    <span>{displayValue}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
