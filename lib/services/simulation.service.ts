/**
 * Simulation Service
 * Handles the mapping of Supabase/Application data to the "Dumb" Backend API format.
 */

import { getTranslatedField } from "@/lib/localization-utils";

interface LocalizedString {
  [langCode: string]: string;
}

interface EntityAbilityScalingData {
  level: number;
  value: number;
  value_type: string;
  scaling_stat_id: string;
  attribute_index: number;
}

interface EntityAbilityData {
  name: LocalizedString;
  entity_ability_scaling?: EntityAbilityScalingData[];
}

interface StatDefData {
  id?: string;
  name: LocalizedString;
  is_scalable?: boolean;
}

interface EntityStatData {
  stat_id: string;
  level: number;
  phase_index?: number;
  value: number;
  section_stats?: StatDefData;
}

interface EntityFieldValueData {
  game_field_id: string;
  option_id?: string;
}

interface SectionEntityData {
  name: LocalizedString;
  entity_stats?: EntityStatData[];
  entity_field_values?: EntityFieldValueData[];
  entity_abilities?: EntityAbilityData[];
}

interface OwnedEntityData {
  entity_id: string;
  level: number;
  dupes?: number;
  phase_index?: number;
  section_entities: SectionEntityData;
}

interface EnemyData {
  id: string;
  name: LocalizedString;
  entity_stats?: EntityStatData[];
  entity_field_values?: EntityFieldValueData[];
}

interface FieldOptionData {
  id: string;
  value_key: LocalizedString;
}

export interface ApiStatValue {
  value: number;
  name: string;
}

export interface ApiAbilityScaling {
  level: number;
  value: number;
  value_type: string;
  scaling_stat_id: string;
  attribute_index: number;
}

export interface ApiAbility {
  name: string;
  level: number;
  scalings: ApiAbilityScaling[];
}

export interface ApiLightconePayload {
  lightcone_id: string;
  name: string;
  level: number;
  superimposition: number;
  basic_stats: Record<string, ApiStatValue>;
  advanced_stats: Record<string, ApiStatValue>;
  ability: ApiAbility | null;
  path: string | null;
}

export interface ApiCharacterPayload {
  character_id: string;
  name: string;
  level: number;
  eidolon: number;
  basic_stats: Record<string, ApiStatValue>;
  advanced_stats: Record<string, ApiStatValue>;
  abilities: ApiAbility[];
  attribute: string | null;
  path: string | null;
}

export interface ApiEnemyPayload {
  id: string;
  instance_id: string;
  name: string;
  level: number;
  basic_stats: Record<string, ApiStatValue>;
  advanced_stats: Record<string, ApiStatValue>;
  resistances: Record<string, number>;
  weaknesses: string[];
  tier: string | null;
}

export interface SimulationRequest {
  command: "simulate" | "optimize";
  game: "hsr";
  payload: {
    team?: ApiCharacterPayload[];
    character_pool?: ApiCharacterPayload[];
    lightcone_pool?: ApiLightconePayload[];
    waves: {
      enemies: (ApiEnemyPayload | null)[];
    }[];
    settings: {
      max_cycles: number;
      has_castorice: boolean;
    };
  };
}

/**
 * Maps internal abilities to API format
 */
function mapAbilities(abilities: EntityAbilityData[], lang: string, defaultLang: string, targetLevel: number | null = null): ApiAbility[] {
  if (!abilities) return [];

  return abilities.map((ab) => {
    // Determine the level to send. If targetLevel is null, find the max level available in scalings.
    let level = targetLevel;
    if (level === null) {
      const levels = ab.entity_ability_scaling?.map((s) => s.level) || [];
      level = levels.length > 0 ? Math.max(...levels) : 1;
    }

    // Include target level and up to 2 levels below
    const levelsToInclude = [level, level - 1, level - 2].filter(l => l > 0);

    const scalings = ab.entity_ability_scaling
      ?.filter((s) => levelsToInclude.includes(s.level))
      .map((s) => ({
        level: s.level,
        value: s.value,
        value_type: s.value_type,
        scaling_stat_id: s.scaling_stat_id,
        attribute_index: s.attribute_index
      })) || [];

    return {
      name: getTranslatedField(ab.name, lang, defaultLang),
      level,
      scalings
    };
  });
}

const WEAKNESS_FIELD_ID = "57f03887-a9e4-4299-a4e7-e8217dab3a91";
const TIER_FIELD_ID = "e9902c8f-779a-4177-b418-34eb69402f47";
const ATTRIBUTE_FIELD_ID = "57f03887-a9e4-4299-a4e7-e8217dab3a91";
const PATH_FIELD_ID = "4bda7d33-968a-4149-a558-c26bd63130f9";

/**
 * Maps an internal Character object to the API format
 */
export function mapCharacterToApi(char: OwnedEntityData, lang: string, defaultLang: string, sectionStats: StatDefData[], options: FieldOptionData[] = []): ApiCharacterPayload {
  const basicStatsMap = new Map<string, ApiStatValue>();
  const advancedStatsMap = new Map<string, ApiStatValue>();
  const charData = char.section_entities;
  const targetLevel = Number(char.level);
  const targetPhase = Number(char.phase_index || 0);

  charData.entity_stats?.forEach((s) => {
    // Use joined section_stats if available, otherwise find in sectionStats array
    const statDef = s.section_stats || sectionStats.find((ds) => ds.id === s.stat_id);
    const name = statDef ? getTranslatedField(statDef.name, lang, defaultLang) : "Unknown";
    const key = s.stat_id;
    const sLevel = Number(s.level);
    const sPhase = Number(s.phase_index || 0);

    // A stat is basic if it's explicitly scalable
    if (statDef?.is_scalable === true) {
      if (sLevel === targetLevel) {
        // If levels match, check phase if it's a "boundary" level (like 20, 30...)
        // For HSR, level 80 usually only has one entry, but for lower levels, phase matters.
        if (sPhase === targetPhase || !basicStatsMap.has(key)) {
            basicStatsMap.set(key, { value: s.value, name });
        }
      } else if (!basicStatsMap.has(key) && (sLevel === 1 || sLevel === 0)) {
        // Fallback for base stats if char-level stat not found yet
        basicStatsMap.set(key, { value: s.value, name });
      }
    } else {
      // Static stats (Traces, level 0 or null)
      if (sLevel === 0 || !advancedStatsMap.has(key)) {
        advancedStatsMap.set(key, { value: s.value, name });
      }
    }
  });

  const attributeValue = charData.entity_field_values?.find((v) => v.game_field_id === ATTRIBUTE_FIELD_ID);
  const attributeOpt = options.find((o) => o.id === attributeValue?.option_id);
  const attribute = attributeOpt ? getTranslatedField(attributeOpt.value_key, lang, defaultLang) : null;

  const pathValue = charData.entity_field_values?.find((v) => v.game_field_id === PATH_FIELD_ID);
  const pathOpt = options.find((o) => o.id === pathValue?.option_id);
  const path = pathOpt ? getTranslatedField(pathOpt.value_key, lang, defaultLang) : null;

  return {
    character_id: char.entity_id,
    name: getTranslatedField(charData.name, lang, defaultLang),
    level: targetLevel,
    eidolon: char.dupes || 0,
    basic_stats: Object.fromEntries(basicStatsMap),
    advanced_stats: Object.fromEntries(advancedStatsMap),
    abilities: mapAbilities(charData.entity_abilities, lang, defaultLang),
    attribute,
    path
  };
}

/**
 * Maps an internal Lightcone object to the API format
 */
export function mapLightconeToApi(lc: OwnedEntityData, lang: string, defaultLang: string, sectionStats: StatDefData[], options: FieldOptionData[] = []): ApiLightconePayload {
  const basicStatsMap = new Map<string, ApiStatValue>();
  const advancedStatsMap = new Map<string, ApiStatValue>();
  const lcData = lc.section_entities;
  const targetLevel = Number(lc.level);
  const targetPhase = Number(lc.phase_index || 0);

  lcData.entity_stats?.forEach((s) => {
    const statDef = s.section_stats || sectionStats.find((ds) => ds.id === s.stat_id);
    const name = statDef ? getTranslatedField(statDef.name, lang, defaultLang) : "Unknown";
    const key = s.stat_id;
    const sLevel = Number(s.level);
    const sPhase = Number(s.phase_index || 0);

    if (statDef?.is_scalable === true) {
      if (sLevel === targetLevel) {
        if (sPhase === targetPhase || !basicStatsMap.has(key)) {
            basicStatsMap.set(key, { value: s.value, name });
        }
      } else if (!basicStatsMap.has(key) && (sLevel === 1 || sLevel === 0)) {
        basicStatsMap.set(key, { value: s.value, name });
      }
    } else {
      if (sLevel === 0 || !advancedStatsMap.has(key)) {
        advancedStatsMap.set(key, { value: s.value, name });
      }
    }
  });

  const pathValue = lcData.entity_field_values?.find((v) => v.game_field_id === PATH_FIELD_ID);
  const pathOpt = options.find((o) => o.id === pathValue?.option_id);
  const path = pathOpt ? getTranslatedField(pathOpt.value_key, lang, defaultLang) : null;

  const superimposition = Number(lc.dupes) + 1 || 1;
  const lcAbilities = mapAbilities(lcData.entity_abilities, lang, defaultLang, superimposition);

  return {
    lightcone_id: lc.entity_id,
    name: getTranslatedField(lcData.name, lang, defaultLang),
    level: targetLevel,
    superimposition,
    basic_stats: Object.fromEntries(basicStatsMap),
    advanced_stats: Object.fromEntries(advancedStatsMap),
    ability: lcAbilities.length > 0 ? lcAbilities[0] : null,
    path
  };
}

// Element Mapping for HSR (from HSR_ID_MAPPING.md)
export const ELEMENTAL_RES_MAP: Record<string, string> = {
  "Physical": "441500bc-47dc-452f-9f1f-f0aaa142ce62",
  "Fire": "2c50d8d8-3d62-4e5d-8221-68f28d8cdddb",
  "Ice": "cc934b70-7aca-46dc-beb2-0aafc221e2ec",
  "Lightning": "3de09fc5-7cb1-412f-aac0-0ebb0ba905e8",
  "Wind": "4c775af5-281e-4bbb-8ca2-b2e3f20f3c18",
  "Quantum": "9deee2d8-f7bf-41b7-829e-2485837784df",
  "Imaginary": "176151ff-8d54-4b1b-98fb-03ef410d7371"
};

/**
 * Maps an internal Enemy object to the API format
 */
export function mapEnemyToApi(enemy: EnemyData, level: number, instanceId: string, lang: string, defaultLang: string, sectionStats: StatDefData[], options: FieldOptionData[] = []): ApiEnemyPayload {
  const basicStatsMap = new Map<string, ApiStatValue>();
  const advancedStatsMap = new Map<string, ApiStatValue>();
  const targetLevel = Number(level);

  enemy.entity_stats?.forEach((s) => {
    const statDef = s.section_stats || sectionStats.find((ds) => ds.id === s.stat_id);
    const name = statDef ? getTranslatedField(statDef.name, lang, defaultLang) : "Unknown";
    const key = s.stat_id;
    const sLevel = Number(s.level);

    // For enemies, HP/ATK/DEF/SPD/Toughness are scalable
    if (statDef?.is_scalable === true) {
      if (sLevel === targetLevel || (!basicStatsMap.has(key) && (sLevel === 80 || sLevel === 1))) {
        basicStatsMap.set(key, { value: s.value, name });
      }
    } else {
      if (sLevel === 0 || !advancedStatsMap.has(key)) {
        advancedStatsMap.set(key, { value: s.value, name });
      }
    }
  });

  // 1. Populate Elemental RES
  const resistancesMap = new Map<string, number>();
  Object.entries(ELEMENTAL_RES_MAP).forEach(([elementName, statId]) => {
      let stat = enemy.entity_stats?.find((s) => s.stat_id === statId && s.level === level);
      if (!stat) {
          stat = enemy.entity_stats?.find((s) => s.stat_id === statId);
      }

      if (stat) {
          let val = stat.value;
          if (val > 0 && val <= 1) val = val * 100;
          resistancesMap.set(elementName, val / 100);
      } else {
          resistancesMap.set(elementName, 0.2); // Default 20%
      }
  });

  // 2. Fetch Weaknesses
  const weaknessValues = enemy.entity_field_values?.filter((v) => v.game_field_id === WEAKNESS_FIELD_ID) || [];
  const weaknesses = weaknessValues.map((v) => {
      const opt = options.find((o) => o.id === v.option_id);
      return opt ? getTranslatedField(opt.value_key, lang, defaultLang) : null;
  }).filter(Boolean);

  // 3. Fetch Tier
  const tierValue = enemy.entity_field_values?.find((v) => v.game_field_id === TIER_FIELD_ID);
  const tierOpt = options.find((o) => o.id === tierValue?.option_id);
  const tier = tierOpt ? getTranslatedField(tierOpt.value_key, lang, defaultLang) : null;

  return {
    id: enemy.id,
    instance_id: instanceId,
    name: getTranslatedField(enemy.name, lang, defaultLang),
    level,
    basic_stats: Object.fromEntries(basicStatsMap),
    advanced_stats: Object.fromEntries(advancedStatsMap),
    resistances: Object.fromEntries(resistancesMap),
    weaknesses,
    tier
  };
}

/**
 * Sends the payload to your dedicated backend
 */
export async function sendToSimulationBackend(request: SimulationRequest): Promise<Record<string, unknown>> {
  const API_URL = process.env.NEXT_PUBLIC_SIMULATOR_API_URL || "http://localhost:8080/execute";
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to connect to simulation backend:", error);
    throw error;
  }
}
