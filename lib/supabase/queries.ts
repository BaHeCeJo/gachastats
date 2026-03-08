import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createPublicClient, createClient } from './server';
import { slugify } from '../utils/slugify';
import { safeGet } from '../localization-utils';

export type LocalizedString = Record<string, string>;

export interface Game {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
}

export interface Section {
  id: string;
  key: LocalizedString;
  game_id: string;
  icon_path: string | null;
  color: string | null;
  is_collectible: boolean;
  is_unique: boolean;
  min_dupes: number;
  max_dupes: number;
  dupe_name: LocalizedString;
  has_teams: boolean;
  max_team_size: number;
  order_index: number;
  skin_image_types: string[];
}

export interface FieldOption {
  id: string;
  game_field_id: string;
  value_key: LocalizedString;
  icon_path: string | null;
  color: string | null;
  order_index: number;
}

export interface GameField {
  manual_fill: boolean;
  has_icon: boolean;
  has_color: boolean;
  field_options: FieldOption[];
}

export interface SectionField {
  id: string;
  key: LocalizedString;
  required: boolean;
  is_multi: boolean;
  category: string | null;
  order_index: number;
  game_field_id: string;
  game_fields: GameField | GameField[];
}

export interface EntityFieldValue {
  id?: string;
  game_field_id: string;
  value_text: string | LocalizedString | null;
  option_id: string | null;
  field_options?: {
    color: string | null;
    icon_path: string | null;
    value_key: LocalizedString;
  } | {
    color: string | null;
    icon_path: string | null;
    value_key: LocalizedString;
  }[];
}

export interface EntityImage {
  id: string;
  type: string;
  key: string;
  image_path: string;
  width: number | null;
  height: number | null;
  order_index: number;
}

export interface EntitySkin {
  id: string;
  entity_id: string;
  name: LocalizedString;
  is_default: boolean;
  entity_images: EntityImage[];
}

export interface SectionDisplaySettings {
  section_id: string;
  max_columns: number;
  bg_color_field_id: string | null;
  top_left_icon_field_id: string | null;
  top_right_icon_field_id: string | null;
  overlay_icon_field_id: string | null;
  filter_field_ids: string[];
}

export interface SectionEntity {
  id: string;
  section_id: string;
  name: LocalizedString;
  icon_path: string | null;
  entity_skins: EntitySkin[];
  entity_field_values?: EntityFieldValue[];
}

/**
 * Cached fetch for a user's profile.
 */
export const getUserProfile = cache(async (userId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase
        .from("profiles")
        .select("role, nickname, avatar_url")
        .eq("id", userId)
        .single();
    },
    [`profile-${userId}`],
    { revalidate: 3600, tags: [`profile-${userId}`] }
  )();
});

/**
 * Cached fetch for all games.
 */
export const getGames = cache(async () => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase
        .from("games")
        .select("id, name, slug, description, cover_url, default_lang, supported_languages")
        .order("created_at", { ascending: false });
    },
    ['all-games'],
    { revalidate: 3600, tags: ['games'] }
  )();
});

/**
 * Cached fetch for a single game by its slug.
 */
export const getGameBySlug = cache(async (slug: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase
        .from("games")
        .select("id, name, slug, description, cover_url, default_lang, supported_languages")
        .eq("slug", slug)
        .single();
    },
    [`game-${slug}`],
    { revalidate: 3600, tags: [`game-${slug}`] }
  )();
});

/**
 * Cached fetch for a single section by its ID.
 */
export const getSectionById = cache(async (sectionId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const res = await supabase
        .from("game_sections")
        .select("id, key, game_id, icon_path, color, is_collectible, is_unique, min_dupes, max_dupes, dupe_name, has_teams, max_team_size, order_index, skin_image_types")
        .eq("id", sectionId)
        .single();
      
      if (res.error) {
        console.error(`[getSectionById] Error fetching section ${sectionId}:`, res.error);
      }
      return res;
    },
    [`section-${sectionId}`],
    { revalidate: 3600, tags: [`section-${sectionId}`] }
  )();
});

/**
 * Fetch a section by game ID and its English key (natural lookup).
 */
export const getSectionByNames = cache(async (gameId: string, sectionKey: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase
        .from("game_sections")
        .select("*")
        .eq("game_id", gameId)
        .eq("key->>en", sectionKey) // Using JSONB lookup
        .single();
    },
    [`section-${gameId}-${sectionKey}`],
    { revalidate: 3600, tags: [`section-${gameId}-${sectionKey}`] }
  )();
});

/**
 * Fetch an entity by section ID and its English name (natural lookup).
 */
export const getEntityByNames = cache(async (sectionId: string, entityName: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase
        .from("section_entities")
        .select(`
          *,
          entity_skins (
            *,
            entity_images (*)
          )
        `)
        .eq("section_id", sectionId)
        .eq("name->>en", entityName) // Using JSONB lookup
        .single();
    },
    [`entity-${sectionId}-${entityName}`],
    { revalidate: 3600, tags: [`entity-${sectionId}-${entityName}`] }
  )();
});

/**
 * Resolves a section ID from its slug within a game.
 */
export async function resolveSectionBySlug(gameId: string, sectionSlug: string, gameDefaultLang: string) {
  const supabase = createPublicClient();
  const { data: sections } = await supabase
    .from("game_sections")
    .select("id, key")
    .eq("game_id", gameId);

  const matched = (sections || []).find(s => {
    const key = safeGet(s.key as LocalizedString, gameDefaultLang) || safeGet(s.key as LocalizedString, 'en') || '';
    return slugify(key) === sectionSlug;
  });

  return matched || null;
}

/**
 * Resolves an entity ID from its slug within a section.
 */
export async function resolveEntityBySlug(sectionId: string, entitySlug: string, gameDefaultLang: string) {
  const supabase = createPublicClient();
  const { data: entities } = await supabase
    .from("section_entities")
    .select("id, name")
    .eq("section_id", sectionId);

  const matched = (entities || []).find(e => {
    const name = safeGet(e.name as LocalizedString, gameDefaultLang) || safeGet(e.name as LocalizedString, 'en') || '';
    return slugify(name) === entitySlug;
  });

  return matched || null;
}

/**
 * Cached fetch for section fields.
 */
export const getSectionFields = cache(async (sectionId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase.from("section_fields").select(`
        id, key, required, is_multi, category, order_index, game_field_id,
        game_fields (
          manual_fill, has_icon, has_color,
          field_options ( id, value_key, icon_path, color, order_index )
        )
      `).eq("section_id", sectionId).order("order_index", { ascending: true });
    },
    [`section-fields-${sectionId}`],
    { revalidate: 3600, tags: [`section-fields-${sectionId}`] }
  )();
});

/**
 * Cached fetch for field options.
 */
export const getFieldOptions = cache(async () => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase.from("field_options").select("id, game_field_id, value_key, icon_path, color, order_index");
    },
    ['all-field-options'],
    { revalidate: 3600, tags: ['field-options'] }
  )();
});

/**
 * Cached fetch for section display settings.
 */
export const getSectionDisplaySettings = cache(async (sectionId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase.from("section_display_settings").select("*").eq("section_id", sectionId).single();
    },
    [`section-settings-${sectionId}`],
    { revalidate: 3600, tags: [`section-settings-${sectionId}`] }
  )();
});

/**
 * Cached fetch for section entities with pagination and field limiting.
 * Default pageSize 1000 effectively fetches all for most games while staying optimized.
 */
export const getSectionEntities = cache(async (
  sectionId: string, 
  defaultLang: string, 
  page: number = 0, 
  pageSize: number = 1000
) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const from = page * pageSize;
      const to = from + pageSize - 1;

      return supabase.from("section_entities").select(`
        id, 
        section_id,
        name, 
        icon_path,
        entity_skins!left ( 
          id,
          entity_id,
          name,
          is_default,
          entity_images ( id, type, key, image_path, width, height, order_index ) 
        ),
        entity_field_values ( 
          id,
          game_field_id, 
          value_text, 
          option_id,
          field_options ( color, icon_path, value_key )
        )
      `)
      .eq("section_id", sectionId)
      .eq("entity_skins.is_default", true)
      .order(`name->>${defaultLang}`, { ascending: true })
      .range(from, to);
    },
    [`section-entities-${sectionId}-${defaultLang}-p${page}-s${pageSize}`],
    { revalidate: 3600, tags: [`section-entities-${sectionId}`] }
  )();
});

/**
 * Cached fetch for a single entity by its ID (Public version).
 */
export const getEntityById = cache(async (entityId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase.from("section_entities")
        .select(`*, entity_skins (id, entity_id, is_default, name, entity_images (id, type, key, image_path, width, height, order_index))`)
        .eq("id", entityId)
        .single();
    },
    [`entity-${entityId}`],
    { revalidate: 3600, tags: [`entity-${entityId}`] }
  )();
});

/**
 * Optimized fetch for a full entity by its ID (Admin version).
 * Includes skins, images, and field values in a single request.
 */
export const getFullEntityById = cache(async (entityId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase.from("section_entities").select(`
        id, 
        section_id, 
        name, 
        icon_path,
        entity_skins (
          id, 
          entity_id, 
          name, 
          is_default,
          entity_images ( id, type, key, image_path, width, height, order_index )
        ),
        entity_field_values (
          id,
          game_field_id,
          value_text,
          option_id,
          field_options (
            color,
            icon_path,
            value_key
          )
        )
      `).eq("id", entityId).single();
    },
    [`entity-full-${entityId}`],
    { revalidate: 3600, tags: [`entity-${entityId}`] }
  )();
});

/**
 * Cached fetch for entity field values.
 */
export const getEntityFieldValues = cache(async (entityId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase.from("entity_field_values").select("id, game_field_id, value_text, option_id").eq("entity_id", entityId);
    },
    [`entity-values-${entityId}`],
    { revalidate: 3600, tags: [`entity-values-${entityId}`] }
  )();
});

/**
 * Lightweight fetch for section entities (ID, Name, Icon only).
 * Used for populating selection lists and team builders.
 */
export const getSectionEntitiesLibrary = cache(async (sectionId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      return supabase
        .from("section_entities")
        .select(`
          id, 
          name, 
          icon_path,
          entity_skins(
            is_default,
            entity_images(type, image_path)
          )
        `)
        .eq("section_id", sectionId)
        .eq("entity_skins.is_default", true);
    },
    [`section-library-${sectionId}`],
    { revalidate: 3600, tags: [`section-entities-${sectionId}`] }
  )();
});

/**
 * Optimized fetch for a user's collection in a specific section.
 * Combines entity data, field values, and ownership status.
 * Authenticated: Respects RLS.
 */
export const getUserSectionCollection = cache(async (sectionId: string, userId: string, defaultLang: string) => {
  const supabase = await createClient();
  
  // Note: We use React cache() for per-request deduplication.
  // We avoid unstable_cache here because it runs in a background context 
  // without the user's session cookies, which RLS requires.
  return supabase.from("section_entities").select(`
    id, 
    section_id, 
    name, 
    icon_path,
    entity_skins ( 
      entity_images ( image_path, type ) 
    ),
    entity_field_values ( 
      game_field_id, 
      value_text, 
      option_id, 
      field_options ( color, icon_path, value_key ) 
    ),
    user_entities!left (
      id,
      dupes
    )
  `)
  .eq("section_id", sectionId)
  .eq("user_entities.user_id", userId)
  .eq("entity_skins.is_default", true)
  .order(`name->>${defaultLang}`, { ascending: true });
});

export const getEntityTeams = cache(async (entityId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      // First get team IDs where the entity is a member
      const { data: memberData } = await supabase
        .from("section_team_members")
        .select("team_id")
        .eq("entity_id", entityId);
      
      const teamIds = (memberData || []).map((m: { team_id: string }) => m.team_id);
      if (teamIds.length === 0) return { data: [], error: null };

      // Then fetch full team details
      return supabase
        .from("section_teams")
        .select(`*, section_team_members(*)`)
        .in("id", teamIds)
        .order('created_at', { ascending: false });
    },
    [`entity-teams-${entityId}`],
    { revalidate: 3600, tags: [`entity-teams-${entityId}`] }
  )();
});
