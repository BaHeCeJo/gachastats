"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/types";
import { slugify } from "@/lib/utils/slugify";
import { smartUpdateImage, deleteAssets } from "@/lib/services/storage.service";

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === 'admin';
}

interface FieldValueInput {
  field_id: string;
  values: string[];
}

interface FieldDefResult {
  id: string;
  is_multi: boolean;
  game_field_id: string;
  game_fields: {
    manual_fill: boolean;
  } | null;
}

export async function upsertEntityAction(
  gameSlug: string,
  sectionId: string,
  gameDefaultLang: string,
  formData: FormData
) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const supabase = await createClient();

  const entityId = formData.get("id") as string | undefined;
  const rawName = JSON.parse(formData.get("name") as string) as LocalizedString;
  const iconFile = formData.get("icon_file");
  const existingIconPath = formData.get("existing_icon_path") as string | null;
  const fieldValuesJson = formData.get("field_values") as string;
  const fieldValues: FieldValueInput[] = fieldValuesJson ? JSON.parse(fieldValuesJson) : [];

  if (!rawName[gameDefaultLang]) {
    return { error: `Name for default language (${gameDefaultLang.toUpperCase()}) is required.` };
  }

  let oldIconPath: string | null = existingIconPath;
  if (entityId && !iconFile && !existingIconPath) {
    const { data: currentEntity } = await supabase.from("section_entities").select("icon_path").eq("id", entityId).single();
    oldIconPath = currentEntity?.icon_path || null;
  }

  const entitySlug = slugify(rawName[gameDefaultLang]);
  const icon_path = await smartUpdateImage(iconFile as File | string | null, oldIconPath, "games", `${gameSlug}/sections/${sectionId}/entities/${entitySlug}`);

  const entityData = {
    section_id: sectionId,
    name: rawName,
    icon_path: icon_path,
  };

  let currentEntityId: string;

  if (entityId) {
    const { data, error } = await supabase.from("section_entities").update(entityData).eq("id", entityId).select('id').single();
    if (error) return { error: `Failed to update entity: ${error.message}` };
    currentEntityId = data.id;
  } else {
    const { data, error } = await supabase.from("section_entities").insert(entityData).select('id').single();
    if (error) return { error: `Failed to create entity: ${error.message}` };
    currentEntityId = data.id;
  }

  await supabase.from('entity_field_values').delete().eq('entity_id', currentEntityId);

  const fieldIds = fieldValues.map((fv) => fv.field_id);
  const { data: fieldDefs } = await supabase
    .from("section_fields")
    .select(`id, is_multi, game_field_id, game_fields (manual_fill)`)
    .in("id", fieldIds) as { data: FieldDefResult[] | null };

  const fieldDefMap = new Map(fieldDefs?.map(fd => [fd.id, fd]));
  const valuesToInsert: { entity_id: string; game_field_id: string; value_text: string | null; option_id: string | null; }[] = [];

  for (const fVal of fieldValues) {
    const { field_id, values } = fVal;
    if (!values || values.length === 0) continue;

    const fieldDef = fieldDefMap.get(field_id);
    if (!fieldDef) continue;

    const gameFieldId = fieldDef.game_field_id;
    const manualFill = fieldDef.game_fields?.manual_fill || false;
    const processedOptionIds: string[] = [];

    for (const val of values) {
      if (!val) continue;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      if (isUuid) {
        processedOptionIds.push(val);
      } else if (manualFill) {
        const { data: newOpt, error: optError } = await supabase
          .from("field_options")
          .insert({ game_field_id: gameFieldId, value_key: { [gameDefaultLang]: val } as LocalizedString, order_index: 0 })
          .select("id")
          .single();
        if (!optError) processedOptionIds.push(newOpt.id);
      }
    }

    if (processedOptionIds.length === 0) continue;

    if (fieldDef.is_multi) {
      valuesToInsert.push({ entity_id: currentEntityId, game_field_id: gameFieldId, value_text: processedOptionIds.join(","), option_id: null });
    } else {
      valuesToInsert.push({ entity_id: currentEntityId, game_field_id: gameFieldId, value_text: null, option_id: processedOptionIds[0] });
    }
  }

  if (valuesToInsert.length > 0) await supabase.from('entity_field_values').insert(valuesToInsert);

  updateTag(`entity-${currentEntityId}`);
  updateTag(`section-entities-${sectionId}`);

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${currentEntityId}`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${currentEntityId}`);
}

export async function deleteEntityAction(
  entityId: string,
  gameSlug: string,
  sectionId: string
) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  const supabase = await createClient();

  const { data: images } = await supabase.from("entity_images").select("image_path").eq("entity_id", entityId);

  if (images && images.length > 0) {
    await deleteAssets(images.map(img => img.image_path), "games");
  }

  const { error } = await supabase.from("section_entities").delete().eq("id", entityId);
  if (error) throw new Error(error.message);

  updateTag(`entity-${entityId}`);
  updateTag(`section-entities-${sectionId}`);

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
}

