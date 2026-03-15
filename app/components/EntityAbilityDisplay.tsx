"use client";

import { useState, useMemo } from 'react';
import { EntityAbility, SectionStat, EntityStatValue } from '@/lib/supabase/queries';
import { getTranslatedField } from '@/lib/localization-utils';
import { getPublicUrl } from '@/lib/supabase/client';
import Image from 'next/image';

interface Props {
  abilities: EntityAbility[];
  sectionStats: SectionStat[];
  entityStats: EntityStatValue[];
  gameDefaultLang: string;
}

export default function EntityAbilityDisplay({ abilities, sectionStats, entityStats, gameDefaultLang }: Props) {
  const [level, setLevel] = useState(1);
  const maxLevel = useMemo(() => {
    let max = 1;
    abilities.forEach(ab => {
      ab.entity_ability_scaling?.forEach(s => {
        if (s.level > max) max = s.level;
      });
    });
    return max;
  }, [abilities]);

  const statMap = useMemo(() => {
    const map = new Map<string, SectionStat>();
    sectionStats.forEach(s => map.set(s.id, s));
    return map;
  }, [sectionStats]);

  const entityStatMap = useMemo(() => {
    const map = new Map<string, number>();
    // We only care about the values at the current level (or closest)
    // Actually, for simplicity, we'll just look for the stat at the specified level
    entityStats.forEach(s => {
      map.set(`${s.stat_id}-${s.level}`, s.value);
    });
    return map;
  }, [entityStats]);

  return (
    <div className="space-y-12">
      {maxLevel > 1 && (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-2 w-full">
            <div className="flex justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ability Level Influence</span>
              <span className="text-xl font-black text-[#22c55e] italic">Lv. {level}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max={maxLevel} 
              value={level} 
              onChange={(e) => setLevel(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#22c55e]"
            />
          </div>
          <p className="text-xs text-zinc-500 italic max-w-xs text-center md:text-left">Slide to see how ability values scale based on level and stats.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {abilities.map((ab) => {
          const abName = getTranslatedField(ab.name, gameDefaultLang, gameDefaultLang);
          const abDesc = getTranslatedField(ab.description, gameDefaultLang, gameDefaultLang);
          const iconUrl = ab.icon_path ? getPublicUrl('games', ab.icon_path) : null;

          // Scaling for current level
          const currentScaling = ab.entity_ability_scaling?.filter(s => s.level === level) || [];

          return (
            <div key={ab.id} className="group bg-white dark:bg-zinc-900/40 rounded-[2.5rem] border border-zinc-200 dark:border-white/5 overflow-hidden transition-all hover:shadow-2xl hover:shadow-[#22c55e]/5">
              <div className="p-8 lg:p-10 flex flex-col lg:flex-row gap-10">
                <div className="flex-shrink-0">
                  <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-3xl overflow-hidden bg-zinc-900/50 border border-white/10 shadow-2xl">
                    {iconUrl ? (
                      <Image src={iconUrl} alt={abName} fill className="object-cover transition-transform group-hover:scale-110 duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 font-black text-2xl uppercase italic">Slot</div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-black dark:text-white uppercase italic tracking-tight group-hover:text-[#22c55e] transition-colors">{abName}</h3>
                    <div className="h-1 w-12 bg-[#22c55e] rounded-full" />
                  </div>

                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">{abDesc}</p>

                  {currentScaling.length > 0 && (
                    <div className="flex flex-wrap gap-4 pt-4">
                      {currentScaling.map((s, idx) => {
                        const stat = s.scaling_stat_id ? statMap.get(s.scaling_stat_id) : null;
                        const baseValue = stat ? (entityStatMap.get(`${s.scaling_stat_id}-${level}`) || 0) : null;
                        
                        let displayValue = "";
                        if (s.value_type === 'percent') {
                          const percentStr = `${s.value}%`;
                          if (stat && baseValue !== null) {
                            const calculated = (s.value / 100) * baseValue;
                            displayValue = `${percentStr} of ${getTranslatedField(stat.name, gameDefaultLang, gameDefaultLang)} (${calculated.toFixed(0)})`;
                          } else {
                            displayValue = percentStr;
                          }
                        } else {
                          displayValue = `${s.value}`;
                        }

                        return (
                          <div key={idx} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 rounded-2xl flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Attr {s.attribute_index + 1}</span>
                            <span className="text-sm font-black text-black dark:text-[#22c55e] uppercase italic">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Alternate Forms */}
                  {ab.entity_ability_forms && ab.entity_ability_forms.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Alternate Forms / Modes</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ab.entity_ability_forms.map((form) => {
                          const fIconUrl = form.icon_path ? getPublicUrl('games', form.icon_path) : null;
                          return (
                            <div key={form.id} className="flex gap-4 p-4 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-200/50 dark:border-white/5">
                              {fIconUrl && (
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                                  <Image src={fIconUrl} alt="" fill className="object-cover" />
                                </div>
                              )}
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-black dark:text-zinc-200 uppercase">{getTranslatedField(form.name, gameDefaultLang, gameDefaultLang)}</h4>
                                <p className="text-xs text-zinc-500 line-clamp-2">{getTranslatedField(form.description, gameDefaultLang, gameDefaultLang)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
