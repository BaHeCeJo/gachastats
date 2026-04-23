import { useState, useMemo, useDeferredValue } from "react";
import { getTranslatedField } from "@/lib/localization";
import { LocalizedString } from "@/lib/supabase/queries";

export interface Entity {
  id: string;
  name: LocalizedString;
  allValues: Record<string, string[]>;
}

export function useEntityFiltering<T extends Entity>(
  entities: T[],
  currentLang: string,
  gameDefaultLang: string
) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  
  // Defer the search term and filters to prevent blocking the main thread during input
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredFilters = useDeferredValue(activeFilters);

  const toggleFilter = (fieldId: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      // eslint-disable-next-line security/detect-object-injection
      if (next[fieldId] === value) {
        // eslint-disable-next-line security/detect-object-injection
        delete next[fieldId];
      } else {
        // eslint-disable-next-line security/detect-object-injection
        next[fieldId] = value;
      }
      return next;
    });
  };

  const filteredEntities = useMemo(() => {
    const filtered = entities.filter((entity) => {
      // Apply Search using deferred value
      if (deferredSearchTerm) {
        const name = getTranslatedField(entity.name, currentLang, gameDefaultLang).toLowerCase();
        if (!name.includes(deferredSearchTerm.toLowerCase())) return false;
      }

      // Apply Filters using deferred value
      for (const [fieldId, value] of Object.entries(deferredFilters)) {
        // eslint-disable-next-line security/detect-object-injection
        const entityValues = (entity.allValues as Record<string, string[]>)[fieldId] || [];
        if (!entityValues.includes(value)) return false;
      }
      return true;
    });

    // Sort by name
    return [...filtered].sort((a, b) => {
      const nameA = getTranslatedField(a.name, currentLang, gameDefaultLang).trim();
      const nameB = getTranslatedField(b.name, currentLang, gameDefaultLang).trim();
      
      if (!nameA && nameB) return 1;
      if (nameA && !nameB) return -1;
      if (!nameA && !nameB) return 0;

      const cmp = nameA.localeCompare(nameB, currentLang, { 
        sensitivity: 'accent',
        numeric: true 
      });

      if (cmp === 0) return a.id.localeCompare(b.id);
      return cmp;
    });
  }, [entities, deferredFilters, deferredSearchTerm, currentLang, gameDefaultLang]);

  return {
    activeFilters,
    setActiveFilters,
    searchTerm,
    setSearchTerm,
    toggleFilter,
    filteredEntities,
    isStale: searchTerm !== deferredSearchTerm || activeFilters !== deferredFilters
  };
}
