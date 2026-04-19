-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.entity_abilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  definition_id uuid NOT NULL,
  name jsonb NOT NULL,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entity_abilities_pkey PRIMARY KEY (id),
  CONSTRAINT entity_abilities_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.section_entities(id),
  CONSTRAINT entity_abilities_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES public.section_ability_definitions(id)
);
CREATE TABLE public.entity_ability_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ability_id uuid NOT NULL,
  name jsonb NOT NULL,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon_path text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entity_ability_forms_pkey PRIMARY KEY (id),
  CONSTRAINT entity_ability_forms_ability_id_fkey FOREIGN KEY (ability_id) REFERENCES public.entity_abilities(id)
);
CREATE TABLE public.entity_ability_scaling (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ability_id uuid NOT NULL,
  attribute_index integer NOT NULL,
  level integer NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  value_type text NOT NULL DEFAULT 'percent'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  scaling_stat_id uuid,
  CONSTRAINT entity_ability_scaling_pkey PRIMARY KEY (id),
  CONSTRAINT entity_ability_scaling_ability_id_fkey FOREIGN KEY (ability_id) REFERENCES public.entity_abilities(id),
  CONSTRAINT entity_ability_scaling_scaling_stat_id_fkey FOREIGN KEY (scaling_stat_id) REFERENCES public.section_stats(id)
);
CREATE TABLE public.entity_field_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  option_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  value_text text,
  game_field_id uuid NOT NULL,
  CONSTRAINT entity_field_values_pkey PRIMARY KEY (id),
  CONSTRAINT entity_field_values_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.section_entities(id),
  CONSTRAINT entity_field_values_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.field_options(id),
  CONSTRAINT entity_field_values_game_field_id_fkey FOREIGN KEY (game_field_id) REFERENCES public.game_fields(id)
);
CREATE TABLE public.entity_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  type text NOT NULL,
  key text,
  image_path text NOT NULL,
  width integer,
  height integer,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  skin_id uuid,
  CONSTRAINT entity_images_pkey PRIMARY KEY (id),
  CONSTRAINT entity_images_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.section_entities(id),
  CONSTRAINT entity_images_skin_id_fkey FOREIGN KEY (skin_id) REFERENCES public.entity_skins(id)
);
CREATE TABLE public.entity_skins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  entity_id uuid,
  order_index bigint,
  is_default boolean DEFAULT false,
  name jsonb,
  CONSTRAINT entity_skins_pkey PRIMARY KEY (id),
  CONSTRAINT entity_skins_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.section_entities(id)
);
CREATE TABLE public.entity_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  stat_id uuid NOT NULL,
  level integer NOT NULL CHECK (level > 0),
  value numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  phase_index integer NOT NULL DEFAULT 0,
  CONSTRAINT entity_stats_pkey PRIMARY KEY (id),
  CONSTRAINT entity_stats_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.section_entities(id),
  CONSTRAINT entity_stats_stat_id_fkey FOREIGN KEY (stat_id) REFERENCES public.section_stats(id)
);
CREATE TABLE public.field_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  icon_path text,
  color text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  value_key jsonb NOT NULL,
  game_field_id uuid NOT NULL,
  CONSTRAINT field_options_pkey PRIMARY KEY (id),
  CONSTRAINT field_options_game_field_id_fkey FOREIGN KEY (game_field_id) REFERENCES public.game_fields(id)
);
CREATE TABLE public.game_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  internal_name text NOT NULL,
  manual_fill boolean NOT NULL DEFAULT true,
  has_icon boolean NOT NULL DEFAULT false,
  has_color boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT game_fields_pkey PRIMARY KEY (id),
  CONSTRAINT game_fields_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.game_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  icon_path text,
  color text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  key jsonb NOT NULL,
  is_collectible boolean DEFAULT true,
  is_unique boolean NOT NULL DEFAULT true,
  max_dupes integer NOT NULL DEFAULT 0,
  dupe_name jsonb NOT NULL DEFAULT '{"en": "Duplicate"}'::jsonb,
  min_dupes integer NOT NULL DEFAULT 0,
  has_teams boolean NOT NULL DEFAULT false,
  max_team_size integer NOT NULL DEFAULT 0,
  skin_image_types ARRAY DEFAULT ARRAY['icon'::text, 'splashart'::text],
  has_stats boolean NOT NULL DEFAULT false,
  has_ascension boolean NOT NULL DEFAULT false,
  max_level integer NOT NULL DEFAULT 1,
  CONSTRAINT game_sections_pkey PRIMARY KEY (id),
  CONSTRAINT game_sections_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  cover_url text,
  created_at timestamp with time zone DEFAULT now(),
  default_lang text,
  supported_languages ARRAY DEFAULT '{}'::text[],
  name jsonb NOT NULL,
  description jsonb,
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_default_lang_fkey FOREIGN KEY (default_lang) REFERENCES public.languages(code)
);
CREATE TABLE public.languages (
  code text NOT NULL,
  name text NOT NULL,
  native_name text,
  is_rtl boolean DEFAULT false,
  flag_icon text,
  is_active boolean DEFAULT true,
  CONSTRAINT languages_pkey PRIMARY KEY (code)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  role USER-DEFINED,
  nickname text,
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.section_ability_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  name jsonb NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  max_level integer NOT NULL DEFAULT 1,
  CONSTRAINT section_ability_definitions_pkey PRIMARY KEY (id),
  CONSTRAINT section_ability_definitions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.section_ability_templates(id)
);
CREATE TABLE public.section_ability_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL,
  name jsonb NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT section_ability_templates_pkey PRIMARY KEY (id),
  CONSTRAINT section_ability_templates_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.game_sections(id)
);
CREATE TABLE public.section_ascensions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL,
  phase_index integer NOT NULL,
  min_level integer NOT NULL,
  max_level integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT section_ascensions_pkey PRIMARY KEY (id),
  CONSTRAINT section_ascensions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.game_sections(id)
);
CREATE TABLE public.section_display_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL UNIQUE,
  max_columns integer DEFAULT 6,
  bg_color_field_id uuid,
  top_left_icon_field_id uuid,
  top_right_icon_field_id uuid,
  overlay_icon_field_id uuid,
  filter_field_ids ARRAY DEFAULT '{}'::uuid[],
  skin_display_types ARRAY DEFAULT '{splashart}'::text[],
  CONSTRAINT section_display_settings_pkey PRIMARY KEY (id),
  CONSTRAINT section_display_settings_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.game_sections(id),
  CONSTRAINT section_display_settings_bg_color_field_id_fkey FOREIGN KEY (bg_color_field_id) REFERENCES public.section_fields(id),
  CONSTRAINT section_display_settings_top_left_icon_field_id_fkey FOREIGN KEY (top_left_icon_field_id) REFERENCES public.section_fields(id),
  CONSTRAINT section_display_settings_top_right_icon_field_id_fkey FOREIGN KEY (top_right_icon_field_id) REFERENCES public.section_fields(id),
  CONSTRAINT section_display_settings_overlay_icon_field_id_fkey FOREIGN KEY (overlay_icon_field_id) REFERENCES public.section_fields(id)
);
CREATE TABLE public.section_entities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL,
  icon_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name jsonb NOT NULL,
  CONSTRAINT section_entities_pkey PRIMARY KEY (id),
  CONSTRAINT section_entities_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.game_sections(id)
);
CREATE TABLE public.section_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL,
  required boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_multi boolean DEFAULT false,
  category text,
  key jsonb NOT NULL,
  game_field_id uuid NOT NULL,
  CONSTRAINT section_fields_pkey PRIMARY KEY (id),
  CONSTRAINT section_fields_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.game_sections(id),
  CONSTRAINT section_fields_game_field_id_fkey FOREIGN KEY (game_field_id) REFERENCES public.game_fields(id)
);
CREATE TABLE public.section_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL,
  key text NOT NULL,
  name jsonb NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_scalable boolean DEFAULT true,
  CONSTRAINT section_stats_pkey PRIMARY KEY (id),
  CONSTRAINT section_stats_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.game_sections(id)
);
CREATE TABLE public.section_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  member_type text NOT NULL CHECK (member_type = ANY (ARRAY['entity'::text, 'option'::text])),
  entity_id uuid,
  option_id uuid,
  slot_index integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT section_team_members_pkey PRIMARY KEY (id),
  CONSTRAINT section_team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.section_teams(id),
  CONSTRAINT section_team_members_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.section_entities(id),
  CONSTRAINT section_team_members_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.field_options(id)
);
CREATE TABLE public.section_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL,
  name jsonb NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT section_teams_pkey PRIMARY KEY (id),
  CONSTRAINT section_teams_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.game_sections(id)
);
CREATE TABLE public.user_entities (
  user_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dupes integer NOT NULL DEFAULT 0 CHECK (dupes >= 0),
  level integer DEFAULT 1,
  phase_index integer DEFAULT 0,
  CONSTRAINT user_entities_pkey PRIMARY KEY (id),
  CONSTRAINT user_entities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_entities_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.section_entities(id)
);
CREATE TABLE public.user_games (
  user_id uuid NOT NULL,
  game_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_games_pkey PRIMARY KEY (user_id, game_id),
  CONSTRAINT user_games_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_games_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);