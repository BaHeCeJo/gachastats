"use client";

import Link from "next/link";
import { useLocalizationParams } from "@/lib/localization";
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
    toggleFilter,
    filteredEntities,
    setActiveFilters,
  } = useEntityFiltering(entities, activeLang, gameDefaultLang);

  const maxCols = displaySettings?.max_columns ?? 6;

  return (
    <div className="space-y-8">
      <FilterBar
        filterFields={filterFields}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        currentLang={activeLang}
        gameDefaultLang={gameDefaultLang}
      />

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
            className="grid gap-x-6 gap-y-10 justify-center lg:justify-start"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`,
              maxWidth: `${maxCols * 160 + (maxCols - 1) * 24}px`,
            }}
          >
            {filteredEntities.map((entity) => {
              const entityLink = isAdmin
                ? `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`
                : `/${gameSlug}/sections/${sectionId}/entities/${entity.id}`;

              return (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  displaySettings={displaySettings}
                  currentLang={activeLang}
                  gameDefaultLang={gameDefaultLang}
                  href={entityLink}
                  badgeContent={isAdmin && <MissingTranslationIndicator value={entity.name} />}
                />
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
