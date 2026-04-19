export interface LocalizedString {
  [langCode: string]: string;
}

export interface SectionStat {
  id: string;
  name: LocalizedString;
  is_scalable: boolean;
}

export interface EntityStat {
  stat_id: string;
  level: number;
  value: number;
  phase_index?: number;
  section_stats?: SectionStat;
}

export interface EntityAbilityScaling {
  level: number;
  value: number;
  value_type: string;
  scaling_stat_id: string;
  attribute_index: number;
}

export interface EntityAbility {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  entity_ability_scaling: EntityAbilityScaling[];
}

export interface EntityFieldValue {
  game_field_id: string;
  option_id?: string;
  value_text?: string;
}

export interface SectionEntity {
  id: string;
  name: LocalizedString;
  icon_path: string | null;
  entity_abilities: EntityAbility[];
  entity_stats: EntityStat[];
  entity_field_values: EntityFieldValue[];
}

export interface OwnedEntity {
  id: string;
  entity_id: string;
  level: number;
  dupes: number;
  phase_index: number;
  section_entities: SectionEntity;
}

export interface Enemy {
  id: string;
  name: LocalizedString;
  icon_path: string | null;
  entity_stats: EntityStat[];
  entity_field_values: EntityFieldValue[];
}

export interface FieldOption {
  id: string;
  value_key: LocalizedString;
}

export interface LogActor {
  name: string;
  color: string;
}

export interface LogEntry {
  type: 'header' | 'wave' | 'defeat' | 'victory' | 'action' | 'info';
  message: string;
  av?: number;
  actor?: LogActor;
  subEntries?: string[];
}

export interface SimulationResult {
  total_damage?: number;
  steps?: { name: string; value: number }[];
  logs?: LogEntry[];
}

export interface OptimizationResult {
  bestReport: {
    totalDamage: number;
    logs: LogEntry[];
  };
}
