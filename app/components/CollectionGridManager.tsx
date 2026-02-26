"use client";

import { useState, useMemo, useTransition } from "react";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";
import { toggleCollectionEntityAction } from "@/app/collections/actions";
import { Loader2 } from "lucide-react";

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

type Props = {
  entities: Entity[];
  initialOwnedIds: string[];
  displaySettings: any;
  filterFields: FilterField[];
  gameDefaultLang: string;
  currentLang: string;
};

export default function CollectionGridManager({
  entities,
  initialOwnedIds,
  displaySettings,
  filterFields,
  gameDefaultLang,
  currentLang: browserLang,
}: Props) {
  const { displayLang, t } = useLocalizationParams() as any;
  const activeLang = displayLang || browserLang;

  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set(initialOwnedIds));
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

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
    const isOwned = ownedIds.has(entityId);
    setPendingId(entityId);

    startTransition(async () => {
      const result = await toggleCollectionEntityAction(entityId, isOwned);
      if (result.success) {
        const newOwnedIds = new Set(ownedIds);
        if (isOwned) newOwnedIds.delete(entityId);
        else newOwnedIds.add(entityId);
        setOwnedIds(newOwnedIds);
      } else {
        alert(result.error);
      }
      setPendingId(null);
    });
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
          const isOwned = ownedIds.has(entity.id);
          const isToggling = pendingId === entity.id;
          
          const bgValue = displaySettings?.bg_color_field_id ? entity.fieldValuesMap[displaySettings.bg_color_field_id] : null;
          const topLeftValue = displaySettings?.top_left_icon_field_id ? entity.fieldValuesMap[displaySettings.top_left_icon_field_id] : null;
          const topRightValue = displaySettings?.top_right_icon_field_id ? entity.fieldValuesMap[displaySettings.top_right_icon_field_id] : null;
          const overlayValue = displaySettings?.overlay_icon_field_id ? entity.fieldValuesMap[displaySettings.overlay_icon_field_id] : null;

          return (
            <button
              key={entity.id}
              onClick={() => handleToggle(entity.id)}
              disabled={isPending && !isToggling}
              className={`
                group relative flex flex-col transition-all duration-500 rounded-3xl overflow-hidden border-2 
                ${isOwned 
                  ? "border-[#22c55e] scale-100 shadow-[0_0_30px_rgba(34,197,94,0.2)]" 
                  : "border-zinc-800 scale-95 grayscale-[0.7] opacity-60 hover:grayscale-[0.3] hover:opacity-90 hover:border-zinc-600"}
                hover:scale-100 active:scale-95
              `}
            >
              {/* Square Cell */}
              <div
                className="relative aspect-square overflow-hidden"
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

                {/* Corner Icons */}
                {topLeftValue?.iconUrl && (
                  <div className="absolute top-2 left-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center p-1 z-20 shadow-xl">
                    <img src={topLeftValue.iconUrl} className="w-full h-full object-contain" alt="" />
                  </div>
                )}
                {topRightValue?.iconUrl && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center p-1 z-20 shadow-xl">
                    <img src={topRightValue.iconUrl} className="w-full h-full object-contain" alt="" />
                  </div>
                )}

                {/* Loading Overlay */}
                {isToggling && (
                  <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#22c55e]" />
                  </div>
                )}
              </div>

              {/* Name Label */}
              <div className={`p-3 text-center transition-colors duration-500 ${isOwned ? "bg-[#22c55e] text-black" : "bg-zinc-900 text-zinc-400"}`}>
                <span className="text-[10px] font-black truncate uppercase tracking-widest block">
                  {getTranslatedField(entity.name, activeLang, gameDefaultLang)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
