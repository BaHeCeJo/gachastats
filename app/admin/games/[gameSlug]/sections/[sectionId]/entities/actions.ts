"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
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

  updateTag(`entity-${res.id}`);
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
