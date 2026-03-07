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
  game_fields: GameField;
}

export interface EntityFieldValue {
  id: string;
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
