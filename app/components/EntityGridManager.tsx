"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLocalizationParams, getTranslatedField } from "@/lib/localization";
import MissingTranslationIndicator from "./MissingTranslationIndicator";
import { useEntityFiltering } from "@/lib/hooks/useEntityFiltering";
import { FilterBar } from "./FilterBar";
import { EntityCard } from "./EntityCard";

type Option = {
  id: string;
  value_key: Record<string, string>;
  iconUrl?: string;
  color?: string;
};

type FilterField = {
  id: string;
  key: Record<string, string>;
  options: Option[];
};

type Entity = {
  id: string;
  name: Record<string, string>;
  publicIconUrl: string;
  fieldValuesMap: Record<string, { color?: string; iconUrl?: string }>;
  allValues: Record<string, string[]>;
};

type DisplaySettings = {
  max_columns?: number;
  bg_color_field_id?: string | null;
  top_left_icon_field_id?: string | null;
  top_right_icon_field_id?: string | null;
  overlay_icon_field_id?: string | null;
  filter_field_ids?: string[];
};

type Props = {
  entities: Entity[];
  displaySettings: DisplaySettings | null;
  filterFields: FilterField[];
  gameSlug: string;
  sectionId: string;
  sectionName: string;
  isAdmin?: boolean;
  gameDefaultLang: string;
  currentLang: string;
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
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const {
    activeFilters,
    toggleFilter: baseToggleFilter,
    filteredEntities,
    setActiveFilters: baseSetActiveFilters,
    searchTerm,
    setSearchTerm: baseSetSearchTerm,
    isStale,
  } = useEntityFiltering(entities, activeLang, gameDefaultLang);

  // Progressive rendering: starts with a very small batch to minimize initial TBT
  const [visibleLimit, setVisibleLimit] = useState(20);
  
  useEffect(() => {
    if (visibleLimit < filteredEntities.length) {
      const timeout = setTimeout(() => {
        // Increment limit in chunks
        setVisibleLimit(prev => Math.min(prev + 50, filteredEntities.length));
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [visibleLimit, filteredEntities.length]);

  // Pre-process entities for the cards to minimize JS execution time in the loop
  const processedCards = useMemo(() => {
    return filteredEntities.slice(0, visibleLimit).map((entity) => ({
      ...entity,
      displayName: getTranslatedField(entity.name, activeLang, gameDefaultLang),
      href: isAdmin
        ? `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`
        : `/${gameSlug}/sections/${sectionId}/entities/${entity.id}`,
    }));
  }, [filteredEntities, visibleLimit, activeLang, gameDefaultLang, isAdmin, gameSlug, sectionId]);

  const handleToggleFilter = (fieldId: string, value: string) => {
    setVisibleLimit(20);
    baseToggleFilter(fieldId, value);
  };

  const handleSearchChange = (term: string) => {
    setVisibleLimit(20);
    baseSetSearchTerm(term);
  };

  const handleClearFilters = () => {
    setVisibleLimit(20);
    baseSetActiveFilters({});
    baseSetSearchTerm('');
  };

  const maxCols = displaySettings?.max_columns ?? 6;

  // Use deferred stale check for smoother UI
  const isReallyStale = isStale || (visibleLimit < filteredEntities.length && visibleLimit === 20);

  return (
    <div className={`space-y-8 transition-opacity duration-300 ${isReallyStale ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      <FilterBar
        filterFields={filterFields}
        activeFilters={activeFilters}
        onToggleFilter={handleToggleFilter}
        currentLang={activeLang}
        gameDefaultLang={gameDefaultLang}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
      />

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
            className="grid gap-x-6 gap-y-10 justify-center lg:justify-start"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`,
              maxWidth: `${maxCols * 160 + (maxCols - 1) * 24}px`,
            }}
          >
            {processedCards.map((entity, idx) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                displaySettings={displaySettings}
                currentLang={activeLang}
                gameDefaultLang={gameDefaultLang}
                href={entity.href}
                badgeContent={isAdmin && <MissingTranslationIndicator value={entity.name} />}
                priority={idx < 12}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-gray-800 rounded-2xl">
            <p className="text-gray-500">{t('noEntities')}</p>
            <button
              onClick={handleClearFilters}
              aria-label="Clear all filters and search"
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
