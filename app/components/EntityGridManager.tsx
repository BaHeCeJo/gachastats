"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";
import MissingTranslationIndicator from "./MissingTranslationIndicator";

type Option = {
  id: string;
  value_key: LocalizedString; // Localized
  iconUrl?: string;
  color?: string;
};

type FilterField = {
  id: string;
  key: LocalizedString; // Localized
  options: Option[];
};

type Entity = {
  id: string;
  name: LocalizedString; // Localized
  publicIconUrl: string;
  fieldValuesMap: Record<string, { color?: string; iconUrl?: string }>;
  allValues: Record<string, string[]>;
};

type Props = {
  entities: Entity[];
  displaySettings: any;
  filterFields: FilterField[];
  gameSlug: string;
  sectionId: string;
  sectionName: string; // Already localized before passing
  isAdmin?: boolean;
  gameDefaultLang: string; // Add gameDefaultLang
  currentLang: string; // Add currentLang
};

export default function EntityGridManager({
  entities,
  displaySettings,
  filterFields,
  gameSlug,
  sectionId,
  sectionName,
  isAdmin = false,
  gameDefaultLang,
  currentLang: browserLang,
}: Props) {
  const { displayLang, t } = useLocalizationParams() as any;
  const activeLang = displayLang || browserLang;

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const filteredEntities = useMemo(() => {
    const filtered = entities.filter((entity) => {
      for (const [fieldId, value] of Object.entries(activeFilters)) {
        const entityValues = entity.allValues[fieldId] || [];
        if (!entityValues.includes(value)) return false;
      }
      return true;
    });

    // Alphabetical sort based on current activeLang
    return [...filtered].sort((a, b) => {
      const nameA = getTranslatedField(a.name, activeLang, gameDefaultLang).trim();
      const nameB = getTranslatedField(b.name, activeLang, gameDefaultLang).trim();
      
      // Handle empty names by pushing them to the bottom
      if (!nameA && nameB) return 1;
      if (nameA && !nameB) return -1;
      if (!nameA && !nameB) return 0;

      // Use localeCompare for correct alphabetical order in the target language
      // Using sensitivity 'accent' to ensure items like "é" are sorted predictably 
      // while still being case-insensitive.
      const cmp = nameA.localeCompare(nameB, activeLang, { 
        sensitivity: 'accent',
        numeric: true 
      });

      // If names are identical, fallback to ID for a stable sort
      if (cmp === 0) return a.id.localeCompare(b.id);
      return cmp;
    });
  }, [entities, activeFilters, activeLang, gameDefaultLang]);

  function toggleFilter(fieldId: string, value: string) {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (next[fieldId] === value) {
        delete next[fieldId];
      } else {
        next[fieldId] = value;
      }
      return next;
    });
  }

  const maxCols = displaySettings?.max_columns ?? 6;

  return (
    <div className="space-y-8">
      {/* Visual Filter Interface */}
      {filterFields.length > 0 && (
        <div className="space-y-6 bg-gray-900/50 p-6 rounded-xl border border-gray-800">
          {filterFields.map((field) => (
            <div key={field.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  {getTranslatedField(field.key, activeLang, gameDefaultLang)}
                </span>
                {activeFilters[field.id] && (
                  <button
                    onClick={() => {
                      const next = { ...activeFilters };
                      delete next[field.id];
                      setActiveFilters(next);
                    }}
                    className="text-xs text-[#22c55e] hover:text-[#1da34a]"
                  >
                    {t('clear')}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {field.options.map((opt) => {
                  const isActive = activeFilters[field.id] === opt.id;
                  const displayValue = getTranslatedField(opt.value_key, activeLang, gameDefaultLang);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleFilter(field.id, opt.id)}
                      title={displayValue}
                      className={`
                        relative group flex items-center justify-center transition-all duration-200
                        ${
                          opt.iconUrl
                            ? "w-12 h-12 rounded-lg p-1"
                            : "px-4 py-2 rounded-full text-sm font-medium"
                        }
                        ${
                          isActive
                            ? "bg-[#22c55e] ring-2 ring-[#22c55e] ring-offset-2 ring-offset-gray-900 text-black"
                            : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                        }
                      `}
                    >
                      {opt.iconUrl ? (
                        <>
                          <img
                            src={opt.iconUrl}
                            alt={displayValue}
                            className={`w-full h-full object-contain ${isActive ? "brightness-0" : ""}`}
                          />
                          {/* Tooltip */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-gray-700">
                            {displayValue}
                          </div>
                        </>
                      ) : (
                        <span className={isActive ? "font-bold" : ""}>{displayValue}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entity Grid */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold capitalize">
            {sectionName} ({filteredEntities.length})
          </h2>
          {isAdmin && (
            <Link
              href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/new`}
              className="bg-[#22c55e] text-black px-4 py-2 rounded text-sm font-bold hover:bg-[#1da34a] transition"
            >
              {t('addEntity')}
            </Link>
          )}
        </div>

        {filteredEntities.length > 0 ? (
          <div
            className="grid gap-x-6 gap-y-10"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`,
              maxWidth: `${maxCols * 160 + (maxCols - 1) * 24}px`,
            }}
          >
            {filteredEntities.map((entity) => {
              const bgValue = displaySettings?.bg_color_field_id
                ? entity.fieldValuesMap[displaySettings.bg_color_field_id]
                : null;
              const topLeftValue = displaySettings?.top_left_icon_field_id
                ? entity.fieldValuesMap[displaySettings.top_left_icon_field_id]
                : null;
              const topRightValue = displaySettings?.top_right_icon_field_id
                ? entity.fieldValuesMap[displaySettings.top_right_icon_field_id]
                : null;
              const overlayValue = displaySettings?.overlay_icon_field_id
                ? entity.fieldValuesMap[displaySettings.overlay_icon_field_id]
                : null;

              const entityLink = isAdmin
                ? `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`
                : `/${gameSlug}/sections/${sectionId}/entities/${entity.id}`;

              const cardContent = (
                <>
                  {/* Square Cell Container */}
                  <div
                    className="relative aspect-square overflow-hidden"
                    style={{ backgroundColor: bgValue?.color || "#1a1a1a" }}
                  >
                    {/* Overlay Icon (Centered and maximized without distortion) */}
                    {overlayValue?.iconUrl && (
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <img
                          src={overlayValue.iconUrl}
                          className="w-full h-full object-contain opacity-20 pointer-events-none grayscale brightness-150"
                          alt=""
                        />
                      </div>
                    )}

                    {/* Entity Main Icon (Fills square, crops top/bottom if tall) */}
                    {entity.publicIconUrl ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img
                          src={entity.publicIconUrl}
                          className="w-full h-full object-cover relative z-10"
                          alt={getTranslatedField(entity.name, activeLang, gameDefaultLang)}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 relative z-10">
                        ?
                      </div>
                    )}

                    {/* Corner Icons (Fill their containers) */}
                    {topLeftValue?.iconUrl && (
                      <div className="absolute top-1.5 left-1.5 w-8 h-8 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center p-0 z-20 shadow-2xl overflow-hidden">
                        <img
                          src={topLeftValue.iconUrl}
                          className="w-full h-full object-contain"
                          alt=""
                        />
                      </div>
                    )}
                    {topRightValue?.iconUrl && (
                      <div className="absolute top-1.5 right-1.5 w-8 h-8 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center p-0 z-20 shadow-2xl overflow-hidden">
                        <img
                          src={topRightValue.iconUrl}
                          className="w-full h-full object-contain"
                          alt=""
                        />
                      </div>
                    )}
                  </div>

                  {/* Name Label (Attached to the bottom) */}
                  <div className="bg-black/90 p-2 min-h-[44px] flex items-center justify-center border-t border-gray-800 group-hover:bg-[#22c55e] transition-colors">
                    <span className="text-[11px] font-bold px-1 text-gray-200 group-hover:text-black uppercase tracking-tight flex flex-wrap items-center justify-center gap-1 leading-tight text-center">
                      {getTranslatedField(entity.name, activeLang, gameDefaultLang)}
                      {isAdmin && <MissingTranslationIndicator value={entity.name} />}
                    </span>
                  </div>
                </>
              );

              const commonClasses = "group flex flex-col transition-all duration-300 rounded-xl overflow-hidden border border-gray-800 hover:ring-2 hover:ring-[#22c55e] hover:scale-[1.02]";

              return (
                <Link
                  key={entity.id}
                  href={entityLink}
                  className={commonClasses}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-gray-800 rounded-2xl">
            <p className="text-gray-500">{t('noEntities')}</p>
            <button
              onClick={() => setActiveFilters({})}
              className="mt-4 text-[#22c55e] hover:underline text-sm"
            >
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
