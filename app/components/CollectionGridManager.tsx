"use client";

import { useState, useMemo, useTransition } from "react";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";
import { toggleCollectionEntityAction, updateEntityDupesAction, removeUserEntityAction } from "@/app/collections/actions";
import { Loader2, Plus, Minus, Trash2 } from "lucide-react";

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
  dupe_name: LocalizedString;
};

type Props = {
  entities: Entity[];
  initialOwnedEntities: OwnedEntity[];
  section: Section;
  displaySettings: any;
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
  const { displayLang, t } = useLocalizationParams() as any;
  const activeLang = displayLang || browserLang;

  const [ownedEntities, setOwnedEntities] = useState<OwnedEntity[]>(initialOwnedEntities);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [debounceTimers, setDebounceTimers] = useState<Record<string, NodeJS.Timeout>>({});

  const ownedMap = useMemo(() => {
    const map: Record<string, OwnedEntity[]> = {};
    ownedEntities.forEach(oe => {
      if (!map[oe.entity_id]) map[oe.entity_id] = [];
      map[oe.entity_id].push(oe);
    });
    return map;
  }, [ownedEntities]);

  const filteredEntities = useMemo(() => {
    const filtered = entities.filter((entity) => {
      for (const [fieldId, value] of Object.entries(activeFilters)) {
        const entityValues = entity.allValues[fieldId] || [];
        if (!entityValues.includes(value)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const nameA = getTranslatedField(a.name, activeLang, gameDefaultLang).trim();
      const nameB = getTranslatedField(b.name, activeLang, gameDefaultLang).trim();
      return nameA.localeCompare(nameB, activeLang, { sensitivity: 'accent', numeric: true });
    });
  }, [entities, activeFilters, activeLang, gameDefaultLang]);

  const handleToggle = (entityId: string) => {
    const instances = ownedMap[entityId] || [];
    const isOwned = instances.length > 0;
    
    setPendingId(entityId);

    startTransition(async () => {
      const result = await toggleCollectionEntityAction(entityId, section.is_unique && isOwned);
      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error);
        setPendingId(null);
      }
    });
  };

  const updateDupes = (instanceId: string, newDupes: number) => {
    if (newDupes < section.min_dupes || newDupes > section.max_dupes) return;
    
    // 1. Update UI Instantly
    setOwnedEntities(prev => prev.map(oe => oe.id === instanceId ? { ...oe, dupes: newDupes } : oe));

    // 2. Debounce the server request (wait 500ms after last move)
    if (debounceTimers[instanceId]) clearTimeout(debounceTimers[instanceId]);
    
    const newTimer = setTimeout(() => {
      startTransition(async () => {
        const result = await updateEntityDupesAction(instanceId, newDupes);
        if (!result.success) {
          alert(result.error);
          // Revert on error? (Optional)
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

  // Helper for segments
  const renderSegments = (current: number) => {
    // Only show segments for "extra" dupes above the minimum possible.
    const totalExtra = section.max_dupes - section.min_dupes;
    if (totalExtra <= 0) return null;
    
    return (
      <div className="flex gap-1 mt-2 w-full">
        {Array.from({ length: totalExtra }).map((_, i) => {
          const val = section.min_dupes + i + 1; // Progress starting from min + 1
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

  function toggleFilter(fieldId: string, value: string) {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (next[fieldId] === value) delete next[fieldId];
      else next[fieldId] = value;
      return next;
    });
  }

  const maxCols = displaySettings?.max_columns ?? 6;
  const dupeLabel = getTranslatedField(section.dupe_name, activeLang, gameDefaultLang);

  return (
    <div className="space-y-12">
      {/* Filters */}
      {filterFields.length > 0 && (
        <div className="space-y-6 bg-zinc-800/40 p-8 rounded-[2rem] border border-zinc-700/50">
          {filterFields.map((field) => (
            <div key={field.id} className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  {getTranslatedField(field.key, activeLang, gameDefaultLang)}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {field.options.map((opt) => {
                  const isActive = activeFilters[field.id] === opt.id;
                  const displayValue = getTranslatedField(opt.value_key, activeLang, gameDefaultLang);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleFilter(field.id, opt.id)}
                      className={`
                        relative flex items-center justify-center transition-all duration-300
                        ${opt.iconUrl ? "w-14 h-14 rounded-xl p-1.5" : "px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"}
                        ${isActive 
                          ? "bg-[#22c55e] text-black shadow-[0_0_25px_rgba(34,197,94,0.4)] scale-105" 
                          : "bg-zinc-700/30 hover:bg-zinc-600/50 text-zinc-300 border border-zinc-700 hover:border-zinc-500"}
                      `}
                    >
                      {opt.iconUrl ? (
                        <img src={opt.iconUrl} alt={displayValue} className={`w-full h-full object-contain ${isActive ? "brightness-0" : ""}`} />
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
      )}

      {/* Interactive Collection Grid */}
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
          
          const bgValue = displaySettings?.bg_color_field_id ? entity.fieldValuesMap[displaySettings.bg_color_field_id] : null;
          const topLeftValue = displaySettings?.top_left_icon_field_id ? entity.fieldValuesMap[displaySettings.top_left_icon_field_id] : null;
          const topRightValue = displaySettings?.top_right_icon_field_id ? entity.fieldValuesMap[displaySettings.top_right_icon_field_id] : null;
          const overlayValue = displaySettings?.overlay_icon_field_id ? entity.fieldValuesMap[displaySettings.overlay_icon_field_id] : null;

          return (
            <div key={entity.id} className="relative group">
              <button
                onClick={() => handleToggle(entity.id)}
                disabled={isPending && !isToggling}
                className={`
                  relative flex flex-col transition-all duration-500 rounded-3xl overflow-hidden border-2 w-full
                  ${isOwned 
                    ? "border-[#22c55e] scale-100 shadow-[0_0_30px_rgba(34,197,94,0.2)]" 
                    : "border-zinc-800 scale-95 grayscale-[0.7] opacity-60 hover:grayscale-[0.3] hover:opacity-90 hover:border-zinc-600"}
                  hover:scale-100 active:scale-95
                `}
              >
                <div
                  className="relative aspect-square overflow-hidden w-full"
                  style={{ backgroundColor: isOwned ? (bgValue?.color || "#1a1a1a") : "#121212" }}
                >
                  {overlayValue?.iconUrl && (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <img src={overlayValue.iconUrl} className="w-full h-full object-contain opacity-10 pointer-events-none" alt="" />
                    </div>
                  )}

                  {entity.publicIconUrl ? (
                    <img src={entity.publicIconUrl} className="w-full h-full object-cover relative z-10" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-4xl font-black">?</div>
                  )}

                  {isOwned && (
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md rounded-lg px-2 py-1 z-30 flex items-center gap-1 border border-white/10">
                      <span className="text-[10px] font-black text-[#22c55e]">
                        {section.is_unique ? `${dupeLabel} ${instances[0].dupes}` : `x${instances.length}`}
                      </span>
                    </div>
                  )}

                  {topLeftValue?.iconUrl && <div className="absolute top-2 left-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center p-1 z-20 shadow-xl"><img src={topLeftValue.iconUrl} className="w-full h-full object-contain" alt="" /></div>}
                  {topRightValue?.iconUrl && <div className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center p-1 z-20 shadow-xl"><img src={topRightValue.iconUrl} className="w-full h-full object-contain" alt="" /></div>}

                  {isToggling && (
                    <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin text-[#22c55e]" />
                    </div>
                  )}
                </div>

                <div className={`p-3 text-center transition-colors duration-500 ${isOwned ? "bg-[#22c55e] text-black" : "bg-zinc-900 text-zinc-400"}`}>
                  <span className="text-[10px] font-black truncate uppercase tracking-widest block">
                    {getTranslatedField(entity.name, activeLang, gameDefaultLang)}
                  </span>
                </div>

                {/* Slider for Unique Items (Appears at bottom on hover) */}
                {isOwned && section.is_unique && section.max_dupes > section.min_dupes && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/95 backdrop-blur-3xl p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-50 border-t border-white/5">
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
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#22c55e] z-50"
                    />

                    {renderSegments(instances[0].dupes)}
                  </div>
                )}
              </button>

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
