import { useState, useMemo } from "react";
import { getTranslatedField } from "@/lib/localization";
import { LocalizedString } from "@/lib/types";

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

  const toggleFilter = (fieldId: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (next[fieldId] === value) {
        delete next[fieldId];
      } else {
        next[fieldId] = value;
      }
      return next;
    });
  };

  const filteredEntities = useMemo(() => {
    const filtered = entities.filter((entity) => {
      // Apply Search
      if (searchTerm) {
        const name = getTranslatedField(entity.name, currentLang, gameDefaultLang).toLowerCase();
        if (!name.includes(searchTerm.toLowerCase())) return false;
      }

      // Apply Filters
      for (const [fieldId, value] of Object.entries(activeFilters)) {
        const entityValues = entity.allValues[fieldId] || [];
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
  }, [entities, activeFilters, searchTerm, currentLang, gameDefaultLang]);

  return {
    activeFilters,
    setActiveFilters,
    searchTerm,
    setSearchTerm,
    toggleFilter,
    filteredEntities,
  };
}
