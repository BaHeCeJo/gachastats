"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { getTranslatedField } from "@/lib/localization-utils";
import { slugify } from "@/lib/utils/slugify";
import { uploadImage, extractPathFromUrl } from "@/lib/supabase/storage-utils";
import { SupabaseClient } from "@supabase/supabase-js";

interface FieldValueInput { field_id: string; values: string[]; }
interface FieldDefResult { id: string; is_multi: boolean; game_field_id: string; game_fields: { manual_fill: boolean; } | null; }

/**
 * Resolves current icon path for an existing entity.
 */
async function getCurrentIconPath(supabase: SupabaseClient, entityId: string): Promise<string | null> {
  const { data: currentEntity } = await supabase.from("section_entities").select("icon_path").eq("id", entityId).single();
  return currentEntity?.icon_path ? extractPathFromUrl(currentEntity.icon_path, "games") : null;
}

/**
 * Handles icon path resolution.
 */
async function getIconPath(
  supabase: SupabaseClient,
  entityId: string | undefined,
  rawName: LocalizedString,
  gameDefaultLang: string,
  gameSlug: string,
  sectionId: string,
  iconFile: File | null,
  existingIconPath: string | null
): Promise<string | null> {
  let oldIconPath = existingIconPath;
  if (entityId && !iconFile && !existingIconPath) {
    oldIconPath = await getCurrentIconPath(supabase, entityId);
  }

  if (iconFile && iconFile.size > 0) {
    // eslint-disable-next-line security/detect-object-injection
    const entitySlug = slugify(rawName[gameDefaultLang] || "");
    const newPath = await uploadImage(iconFile, "games", `${gameSlug}/sections/${sectionId}/entities/${entitySlug}`);
    if (oldIconPath && oldIconPath !== newPath) await supabase.storage.from("games").remove([oldIconPath]);
    return newPath;
  }
  
  if (existingIconPath && existingIconPath !== "null") return existingIconPath;
  if (oldIconPath) await supabase.storage.from("games").remove([oldIconPath]);
  return null;
}

/**
 * Processes a single value processing for syncFieldValues.
 */
async function getOptionId(supabase: SupabaseClient, val: string, fieldDef: FieldDefResult, lang: string): Promise<string | null> {
  if (!val) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return val;
  if (!fieldDef.game_fields?.manual_fill) return null;

  const { data: newOpt } = await supabase.from("field_options").insert({ 
    game_field_id: fieldDef.game_field_id, 
    value_key: { [lang]: val } as LocalizedString, 
    order_index: 0 
  }).select("id").single();
  return newOpt?.id || null;
}

/**
 * Processes a single field's values.
 */
async function processSingleField(supabase: SupabaseClient, entityId: string, fVal: FieldValueInput, fieldDef: FieldDefResult, gameDefaultLang: string) {
  const ids = [];
  for (const val of fVal.values) {
    const id = await getOptionId(supabase, val, fieldDef, gameDefaultLang);
    if (id) ids.push(id);
  }

  if (ids.length > 0) {
    return { 
      entity_id: entityId, 
      game_field_id: fieldDef.game_field_id, 
      value_text: fieldDef.is_multi ? ids.join(",") : null, 
      option_id: fieldDef.is_multi ? null : ids[0] 
    };
  }
  return null;
}

/**
 * Handles field value processing logic.
 */
async function processEntityStats(supabase: SupabaseClient, entityId: string, stats: { stat_id: string; level: number; phase_index: number; value: number }[]) {
  await supabase.from('entity_stats').delete().eq('entity_id', entityId);
  if (stats.length > 0) {
    const toInsert = stats.map(s => ({
      entity_id: entityId,
      stat_id: s.stat_id,
      level: s.level,
      phase_index: s.phase_index,
      value: s.value
    }));
    await supabase.from('entity_stats').insert(toInsert);
  }
}

interface AbilityInput {
  definition_id: string;
  name: LocalizedString;
  description: LocalizedString;
  icon_path: string | null;
  entity_ability_forms?: FormInput[];
  entity_ability_scaling?: ScalingInput[];
}

interface FormInput {
  name: LocalizedString;
  description: LocalizedString;
  icon_path: string | null;
}

interface ScalingInput {
  attribute_index: number;
  level: number;
  value: number;
  value_type: 'percent' | 'flat';
  scaling_stat_id: string | null;
}

async function processAbilityForms(supabase: SupabaseClient, abilityId: string, forms: FormInput[], formData?: FormData, abilityIndex?: number, gameSlug?: string, sectionId?: string, abilityName?: string) {
  // Simple delete/re-insert for forms for now
  await supabase.from('entity_ability_forms').delete().eq('ability_id', abilityId);
  if (forms.length > 0) {
    const toInsert = [];
    for (let idx = 0; idx < forms.length; idx++) {
      // eslint-disable-next-line security/detect-object-injection
      const f = forms[idx];
      let icon_path = f.icon_path;

      if (formData && abilityIndex !== undefined && gameSlug && sectionId) {
        const formIconFile = formData.get(`ability-${abilityIndex}-form-${idx}-icon`) as File | null;
        if (formIconFile && formIconFile.size > 0) {
          const formSlug = slugify(getTranslatedField(f.name, 'en', 'en') || `form-${idx}`);
          const abilitySlug = slugify(abilityName || 'ability');
          icon_path = await uploadImage(formIconFile, "games", `${gameSlug}/sections/${sectionId}/abilities/${abilitySlug}/forms/${formSlug}`);
        }
      }

      toInsert.push({
        ability_id: abilityId,
        name: f.name,
        description: f.description,
        icon_path,
        order_index: idx
      });
    }
    await supabase.from('entity_ability_forms').insert(toInsert);
  }
}

async function processAbilityScaling(supabase: SupabaseClient, abilityId: string, scaling: ScalingInput[]) {
  await supabase.from('entity_ability_scaling').delete().eq('ability_id', abilityId);
  if (scaling.length > 0) {
    const toInsert = scaling.map(s => ({
      ability_id: abilityId,
      attribute_index: s.attribute_index,
      level: s.level,
      value: s.value,
      value_type: s.value_type,
      scaling_stat_id: s.scaling_stat_id
    }));
    await supabase.from('entity_ability_scaling').insert(toInsert);
  }
}

async function getAbilityIconPath(
  index: number,
  ab: AbilityInput,
  formData?: FormData,
  gameSlug?: string,
  sectionId?: string
): Promise<string | null> {
  if (formData && gameSlug && sectionId) {
    const iconFile = formData.get(`ability-${index}-icon`) as File | null;
    if (iconFile && iconFile.size > 0) {
      const abilitySlug = slugify(getTranslatedField(ab.name, 'en', 'en') || `ability-${index}`);
      return await uploadImage(iconFile, "games", `${gameSlug}/sections/${sectionId}/abilities/${abilitySlug}`);
    }
  }
  return ab.icon_path;
}

async function processSingleAbility(
  supabase: SupabaseClient,
  entityId: string,
  index: number,
  ab: AbilityInput,
  formData?: FormData,
  gameSlug?: string,
  sectionId?: string
) {
  const icon_path = await getAbilityIconPath(index, ab, formData, gameSlug, sectionId);

  const data = {
    entity_id: entityId,
    definition_id: ab.definition_id,
    name: ab.name,
    description: ab.description,
    icon_path
  };

  const { data: res, error } = await supabase
    .from('entity_abilities')
    .upsert(data, { onConflict: 'entity_id, definition_id' })
    .select('id')
    .single();

  if (!error && res) {
    const abilityNameEn = getTranslatedField(ab.name, 'en', 'en');
    if (ab.entity_ability_forms) {
      await processAbilityForms(supabase, res.id, ab.entity_ability_forms, formData, index, gameSlug, sectionId, abilityNameEn);
    }
    if (ab.entity_ability_scaling) {
      await processAbilityScaling(supabase, res.id, ab.entity_ability_scaling);
    }
  }
}

async function processEntityAbilities(supabase: SupabaseClient, entityId: string, abilities: AbilityInput[], formData?: FormData, gameSlug?: string, sectionId?: string) {
  for (let i = 0; i < abilities.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    await processSingleAbility(supabase, entityId, i, abilities[i], formData, gameSlug, sectionId);
  }
}

async function processFieldValues(
  supabase: SupabaseClient,
  entityId: string,
  fieldValues: FieldValueInput[],
  gameDefaultLang: string
) {
  const idsToFetch = fieldValues.map(fv => fv.field_id);
  const { data: fieldDefs } = await supabase.from("section_fields").select(`id, is_multi, game_field_id, game_fields (manual_fill)`).in("id", idsToFetch) as { data: FieldDefResult[] | null };
  const fieldDefMap = new Map(fieldDefs?.map(fd => [fd.id, fd]));
  const valuesToInsert = [];

  for (const fVal of fieldValues) {
    const fieldDef = fieldDefMap.get(fVal.field_id);
    if (!fieldDef || !fVal.values?.length) continue;
    
    const record = await processSingleField(supabase, entityId, fVal, fieldDef, gameDefaultLang);
    if (record) valuesToInsert.push(record);
  }

  await supabase.from('entity_field_values').delete().eq('entity_id', entityId);
  if (valuesToInsert.length > 0) await supabase.from('entity_field_values').insert(valuesToInsert);
}

export async function upsertEntityAction(gameSlug: string, sectionId: string, gameDefaultLang: string, formData: FormData) {
  const supabase = await createClient();
  const entityId = formData.get("id") as string | undefined;
  const rawName = JSON.parse(formData.get("name") as string) as LocalizedString;

  // eslint-disable-next-line security/detect-object-injection
  if (!rawName[gameDefaultLang]) return { error: "Name for default language is required." };

  const icon_path = await getIconPath(supabase, entityId, rawName, gameDefaultLang, gameSlug, sectionId, formData.get("icon_file") as File | null, formData.get("existing_icon_path") as string | null);

  const entityData = { section_id: sectionId, name: rawName, icon_path };
  const query = entityId ? supabase.from("section_entities").update(entityData).eq("id", entityId) : supabase.from("section_entities").insert(entityData);

  const { data: res, error } = await query.select('id').single();
  if (error) return { error: `Failed to upsert entity: ${error.message}` };
  
  await processFieldValues(supabase, res.id, JSON.parse(formData.get("field_values") as string || "[]"), gameDefaultLang);
  
  if (formData.has("entity_stats")) {
    await processEntityStats(supabase, res.id, JSON.parse(formData.get("entity_stats") as string || "[]"));
  }

  if (formData.has("abilities")) {
    await processEntityAbilities(supabase, res.id, JSON.parse(formData.get("abilities") as string || "[]"), formData, gameSlug, sectionId);
  }

  updateTag(`entity-${res.id}`);
  updateTag(`entity-stats-${res.id}`);
  updateTag(`entity-abilities-${res.id}`);
  updateTag(`section-entities-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${res.id}`);
}

export async function deleteEntityAction(entityId: string, gameSlug: string, sectionId: string) {
  const supabase = await createClient();
  const { data: images } = await supabase.from("entity_images").select("image_path").eq("entity_id", entityId);

  if (images?.length) {
    const paths = images.map((img) => extractPathFromUrl(img.image_path, "games")).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("games").remove(paths);
  }

  const { error } = await supabase.from("section_entities").delete().eq("id", entityId);
  if (error) throw new Error(error.message);

  updateTag(`entity-${entityId}`);
  updateTag(`section-entities-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
}

interface BulkEntityInput {
  id?: string;
  name: LocalizedString;
  icon_path?: string | null;
  field_values?: FieldValueInput[];
  entity_stats?: { stat_id: string; level: number; phase_index: number; value: number }[];
}

export async function bulkUpsertEntitiesAction(sectionId: string, gameDefaultLang: string, entitiesData: BulkEntityInput[]) {
  const supabase = await createClient();
  
  for (const data of entitiesData) {
    const entityData = { 
      section_id: sectionId, 
      name: data.name,
      icon_path: data.icon_path || null
    };

    const query = data.id 
      ? supabase.from("section_entities").update(entityData).eq("id", data.id)
      : supabase.from("section_entities").insert(entityData);

    const { data: res, error } = await query.select('id').single();
    if (error) continue; // Skip failed ones for now or handle better

    if (data.field_values) {
      await processFieldValues(supabase, res.id, data.field_values, gameDefaultLang);
    }
    
    if (data.entity_stats) {
      await processEntityStats(supabase, res.id, data.entity_stats);
    }

    updateTag(`entity-${res.id}`);
    updateTag(`entity-stats-${res.id}`);
  }

  updateTag(`section-entities-${sectionId}`);
  return { success: true };
}
