"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";
import { toggleCollectionEntityAction, updateEntityDupesAction, removeUserEntityAction } from "@/lib/actions/collection";
import { Trash2 } from "lucide-react";
import { useEntityFiltering } from "@/lib/hooks/useEntityFiltering";
import { FilterBar } from "./FilterBar";
import { EntityCard } from "./EntityCard";

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

type Entity = {
  id: string;
  name: LocalizedString;
  publicIconUrl: string;
  fieldValuesMap: Record<string, { color?: string; iconUrl?: string }>;
  allValues: Record<string, string[]>;
};

type OwnedEntity = {
  id: string;
  entity_id: string;
  dupes: number;
};

type Section = {
  id: string;
  is_unique: boolean;
  max_dupes: number;
  min_dupes: number;
  dupe_name: LocalizedString;
  is_collectible: boolean;
};

type DisplaySettings = {
  max_columns?: number;
  bg_color_field_id?: string | null;
  top_left_icon_field_id?: string | null;
  top_right_icon_field_id?: string | null;
  overlay_icon_field_id?: string | null;
};

type Props = {
  entities: Entity[];
  initialOwnedEntities: OwnedEntity[];
  section: Section;
  displaySettings: DisplaySettings | null;
  filterFields: FilterField[];
  gameDefaultLang: string;
  currentLang: string;
};

export default function CollectionGridManager({
  entities,
  initialOwnedEntities,
  section,
  displaySettings,
  filterFields,
  gameDefaultLang,
  currentLang: browserLang,
}: Props) {
  const router = useRouter();
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const [ownedEntities, setOwnedEntities] = useState<OwnedEntity[]>(initialOwnedEntities);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [debounceTimers, setDebounceTimers] = useState<Record<string, NodeJS.Timeout>>({});

  const {
    activeFilters,
    toggleFilter,
    filteredEntities,
  } = useEntityFiltering(entities, activeLang, gameDefaultLang);

  const ownedMap = useMemo(() => {
    const map: Record<string, OwnedEntity[]> = {};
    ownedEntities.forEach(oe => {
      if (!map[oe.entity_id]) map[oe.entity_id] = [];
      map[oe.entity_id].push(oe);
    });
    return map;
  }, [ownedEntities]);

  const handleToggle = (entityId: string) => {
    const instances = ownedMap[entityId] || [];
    const isOwned = instances.length > 0;
    
    setPendingId(entityId);

    startTransition(async () => {
      const result = await toggleCollectionEntityAction(entityId, section.is_unique && isOwned);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
      setPendingId(null);
    });
  };

  const updateDupes = (instanceId: string, newDupes: number) => {
    if (newDupes < section.min_dupes || newDupes > section.max_dupes) return;
    
    setOwnedEntities(prev => prev.map(oe => oe.id === instanceId ? { ...oe, dupes: newDupes } : oe));

    if (debounceTimers[instanceId]) clearTimeout(debounceTimers[instanceId]);
    
    const newTimer = setTimeout(() => {
      startTransition(async () => {
        const result = await updateEntityDupesAction(instanceId, newDupes);
        if (!result.success) {
          alert(result.error);
        }
      });
    }, 500);

    setDebounceTimers(prev => ({ ...prev, [instanceId]: newTimer }));
  };

  const removeInstance = (instanceId: string) => {
    startTransition(async () => {
      const result = await removeUserEntityAction(instanceId);
      if (result.success) {
        setOwnedEntities(prev => prev.filter(oe => oe.id !== instanceId));
      } else {
        alert(result.error);
      }
    });
  };

  const renderSegments = (current: number) => {
    const totalExtra = section.max_dupes - section.min_dupes;
    if (totalExtra <= 0) return null;
    
    return (
      <div className="flex gap-1 mt-2 w-full">
        {Array.from({ length: totalExtra }).map((_, i) => {
          const val = section.min_dupes + i + 1;
          const isActive = val <= current;
          return (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                isActive ? "bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-zinc-800"
              }`} 
            />
          );
        })}
      </div>
    );
  };

  const maxCols = displaySettings?.max_columns ?? 6;
  const dupeLabel = getTranslatedField(section.dupe_name, activeLang, gameDefaultLang);

  return (
    <div className="space-y-12">
      <FilterBar
        filterFields={filterFields}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        currentLang={activeLang}
        gameDefaultLang={gameDefaultLang}
      />

      <div
        className="grid gap-x-6 gap-y-10 justify-center lg:justify-start"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`,
          maxWidth: `${maxCols * 160 + (maxCols - 1) * 24}px`,
        }}
      >
        {filteredEntities.map((entity) => {
          const instances = ownedMap[entity.id] || [];
          const isOwned = instances.length > 0;
          const isToggling = pendingId === entity.id;
          
          return (
            <div key={entity.id} className="relative group">
              <EntityCard
                entity={entity}
                displaySettings={displaySettings}
                currentLang={activeLang}
                gameDefaultLang={gameDefaultLang}
                isOwned={isOwned}
                isToggling={isToggling}
                isDisabled={isPending && !isToggling}
                onToggle={handleToggle}
                badgeContent={isOwned && (
                  <span className="text-[10px] font-black text-[#22c55e]">
                    {section.is_unique ? `${dupeLabel} ${instances[0].dupes}` : `x${instances.length}`}
                  </span>
                )}
              />

              {/* Unique Dupe Slider Overlay */}
              {isOwned && section.is_unique && section.max_dupes > section.min_dupes && (
                <div className="absolute inset-x-0 bottom-0 bg-black/95 backdrop-blur-3xl p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-50 border-t border-white/5 rounded-b-3xl pointer-events-none group-hover:pointer-events-auto">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">{dupeLabel}</span>
                    {instances[0].dupes > section.min_dupes && (
                      <span className="text-[12px] font-black text-[#22c55e]">{instances[0].dupes}</span>
                    )}
                  </div>
                  
                  <input 
                    type="range" 
                    min={section.min_dupes} 
                    max={section.max_dupes} 
                    value={instances[0].dupes} 
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateDupes(instances[0].id, Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#22c55e]"
                  />

                  {renderSegments(instances[0].dupes)}
                </div>
              )}

              {/* Instance Manager for Non-Unique Items */}
              {isOwned && !section.is_unique && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1 z-40 translate-y-full opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto">
                  <div className="bg-zinc-900/95 border border-zinc-800 backdrop-blur-2xl rounded-2xl p-4 shadow-3xl space-y-4 min-w-[260px] mb-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-zinc-800/50 pb-3 flex justify-between items-center">
                      <span>{t('manageCollection')}</span>
                      <div className="px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded-md text-[10px]">x{instances.length}</div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                      {instances.map((ins, idx) => (
                        <div key={ins.id} className="space-y-3 p-3 bg-black/40 rounded-xl border border-white/5 group/instance">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Instance #{idx + 1}</span>
                            <button onClick={() => removeInstance(ins.id)} className="text-zinc-700 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black">
                              <span className="text-zinc-400 uppercase tracking-tighter">{dupeLabel}</span>
                              <span className="text-[#22c55e]">{ins.dupes}</span>
                            </div>
                            <input 
                              type="range" 
                              min={section.min_dupes} 
                              max={section.max_dupes} 
                              value={ins.dupes} 
                              onChange={(e) => updateDupes(ins.id, Number(e.target.value))}
                              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#22c55e]"
                            />
                            {renderSegments(ins.dupes)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => handleToggle(entity.id)}
                      className="w-full py-2 text-[10px] font-black uppercase bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e] hover:text-black rounded-lg transition-all border border-[#22c55e]/20"
                    >
                      {t('addEntity')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
