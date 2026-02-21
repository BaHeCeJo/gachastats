"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Option = {
  id: string;
  value_key: string;
  iconUrl?: string;
  color?: string;
};

type FilterField = {
  id: string;
  key: string;
  options: Option[];
};

type Entity = {
  id: string;
  name: string;
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
  sectionName: string;
};

export default function EntityGridManager({
  entities,
  displaySettings,
  filterFields,
  gameSlug,
  sectionId,
  sectionName,
}: Props) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      for (const [fieldId, value] of Object.entries(activeFilters)) {
        const entityValues = entity.allValues[fieldId] || [];
        if (!entityValues.includes(value)) return false;
      }
      return true;
    });
  }, [entities, activeFilters]);

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
                  {field.key}
                </span>
                {activeFilters[field.id] && (
                  <button
                    onClick={() => {
                      const next = { ...activeFilters };
                      delete next[field.id];
                      setActiveFilters(next);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {field.options.map((opt) => {
                  const isActive = activeFilters[field.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleFilter(field.id, opt.id)}
                      title={opt.value_key}
                      className={`
                        relative group flex items-center justify-center transition-all duration-200
                        ${
                          opt.iconUrl
                            ? "w-12 h-12 rounded-lg p-1"
                            : "px-4 py-2 rounded-full text-sm font-medium"
                        }
                        ${
                          isActive
                            ? "bg-blue-600 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900"
                            : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                        }
                      `}
                    >
                      {opt.iconUrl ? (
                        <>
                          <img
                            src={opt.iconUrl}
                            alt={opt.value_key}
                            className="w-full h-full object-contain"
                          />
                          {/* Tooltip */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-gray-700">
                            {opt.value_key}
                          </div>
                        </>
                      ) : (
                        <span>{opt.value_key}</span>
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
          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/new`}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition"
          >
            Add Entity
          </Link>
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

              return (
                <Link
                  key={entity.id}
                  href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`}
                  className="group flex flex-col transition-all duration-300 rounded-xl overflow-hidden border border-gray-800 hover:ring-2 hover:ring-blue-500 hover:scale-[1.02]"
                >
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
                          alt={entity.name}
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
                  <div className="bg-black/90 p-2 text-center border-t border-gray-800 group-hover:bg-blue-900 transition-colors">
                    <span className="text-[11px] font-bold truncate block px-1 text-gray-200 uppercase tracking-tight">
                      {entity.name}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-gray-800 rounded-2xl">
            <p className="text-gray-500">No entities match the selected filters.</p>
            <button 
              onClick={() => setActiveFilters({})}
              className="mt-4 text-blue-400 hover:underline text-sm"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
