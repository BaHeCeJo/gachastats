"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "@/lib/utils/slugify";

/**
 * Extracts the storage path from a public URL.
 */
function extractPathFromUrl(url: string, bucket: string): string {
  if (!url) return "";
  if (!url.startsWith("http")) return url;
  
  const searchStr = `/${bucket}/`;
  if (!url.includes(searchStr)) return ""; 
  
  const parts = url.split(searchStr);
  return parts[parts.length - 1];
}

/**
 * Handles uploading an image file to Supabase storage.
 */
async function uploadImage(file: File, bucket: string, folder: string): Promise<string> {
  const supabase = await createClient();
  const fileExtension = file.name.split(".").pop();
  const path = `${folder}/${uuidv4()}.${fileExtension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Error uploading image:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return path;
}

/**
 * Upserts (creates or updates) an entity entry.
 */
export async function upsertEntityAction(
  gameSlug: string,
  sectionId: string,
  gameDefaultLang: string,
  formData: FormData
) {
  const supabase = await createClient();

  const entityId = formData.get("id") as string | undefined;
  const rawName = JSON.parse(formData.get("name") as string) as LocalizedString;
  const iconFile = formData.get("icon_file"); // File or null
  const existingIconPath = formData.get("existing_icon_path") as string | null;
  const fieldValuesJson = formData.get("field_values") as string;
  const fieldValues = fieldValuesJson ? JSON.parse(fieldValuesJson) : [];


  if (!rawName[gameDefaultLang]) {
    return { error: `Name for default language (${gameDefaultLang.toUpperCase()}) is required.` };
  }

  let icon_path: string | null = null;
  let oldIconPath: string | null = existingIconPath; // Assume existing path by default

  // Fetch current entity icon_path for deletion if updating
  if (entityId && !iconFile && !existingIconPath) {
    const { data: currentEntity, error: fetchError } = await supabase
      .from("section_entities")
      .select("icon_path")
      .eq("id", entityId)
      .single();

    if (fetchError) {
      console.error("Error fetching current entity for icon management:", fetchError);
      return { error: `Failed to fetch current entity icon: ${fetchError.message}` };
    }
    if (currentEntity?.icon_path) {
      oldIconPath = extractPathFromUrl(currentEntity.icon_path, "games");
    }
  }

  // Handle icon file upload/deletion
  if (iconFile instanceof File && iconFile.size > 0) {
    // New file uploaded
    const entitySlug = slugify(rawName[gameDefaultLang]);
    icon_path = await uploadImage(iconFile, "games", `${gameSlug}/sections/${sectionId}/entities/${entitySlug}`);
    // If there was an old icon, delete it
    if (oldIconPath && oldIconPath !== icon_path) {
      await supabase.storage.from("games").remove([oldIconPath]);
    }
  } else if (existingIconPath && existingIconPath !== "null") {
    // Existing image path was retained, no new upload
    icon_path = existingIconPath;
  } else {
    // Icon was removed or never existed
    icon_path = null;
    // If there was an old icon, delete it
    if (oldIconPath) {
      await supabase.storage.from("games").remove([oldIconPath]);
    }
  }


  const entityData = {
    section_id: sectionId,
    name: rawName,
    icon_path: icon_path,
  };

  let currentEntityId: string;

  if (entityId) {
    // Update existing entity
    const { data, error } = await supabase
      .from("section_entities")
      .update(entityData)
      .eq("id", entityId)
      .select('id')
      .single();

    if (error) {
      console.error("Error updating entity:", error);
      return { error: `Failed to update entity: ${error.message}` };
    }
    currentEntityId = data.id;
  } else {
    // Create new entity
    const { data, error } = await supabase
      .from("section_entities")
      .insert(entityData)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating entity:", error);
      return { error: `Failed to create entity: ${error.message}` };
    }
    currentEntityId = data.id;
  }

  // Update entity_field_values
  // First, delete existing values for this entity
  const { error: deleteValuesError } = await supabase
    .from('entity_field_values')
    .delete()
    .eq('entity_id', currentEntityId);

  if (deleteValuesError) {
    console.error("Error deleting old field values:", deleteValuesError);
    return { error: `Failed to clear old field values: ${deleteValuesError.message}` };
  }

  // OPTIMIZATION: Fetch all field definitions in one query to avoid N+1
  const fieldIds = fieldValues.map((fv: any) => fv.field_id);
  const { data: fieldDefs } = await supabase
    .from("section_fields")
    .select(`
      id,
      is_multi,
      game_field_id,
      game_fields (
        manual_fill
      )
    `)
    .in("id", fieldIds);

  const fieldDefMap = new Map(fieldDefs?.map(fd => [fd.id, fd]));

  const valuesToInsert: any[] = [];

  for (const fVal of fieldValues) {
    const { field_id, values } = fVal;
    if (!values || values.length === 0) continue;

    const fieldDef = fieldDefMap.get(field_id);
    if (!fieldDef) continue;

    const gameFieldId = fieldDef.game_field_id;
    const manualFill = (fieldDef.game_fields as any)?.manual_fill;

    const processedOptionIds: string[] = [];

    for (const val of values) {
      if (!val) continue;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      if (isUuid) {
        processedOptionIds.push(val);
      } else if (manualFill) {
        // This is still sequential because we need the new ID, 
        // but it's much better than fetching the field definition in a loop.
        const { data: newOpt, error: optError } = await supabase
          .from("field_options")
          .insert({
            game_field_id: gameFieldId,
            value_key: { [gameDefaultLang]: val } as LocalizedString,
            order_index: 0
          })
          .select("id")
          .single();

        if (optError) {
          console.error("Error creating manual option:", optError);
          continue;
        }
        processedOptionIds.push(newOpt.id);
      }
    }

    if (processedOptionIds.length === 0) continue;

    if (fieldDef.is_multi) {
      valuesToInsert.push({
        entity_id: currentEntityId,
        game_field_id: gameFieldId,
        value_text: processedOptionIds.join(","),
        option_id: null
      });
    } else {
      valuesToInsert.push({
        entity_id: currentEntityId,
        game_field_id: gameFieldId,
        value_text: null,
        option_id: processedOptionIds[0]
      });
    }
  }

  if (valuesToInsert.length > 0) {
    const { error: insertValuesError } = await supabase
      .from('entity_field_values')
      .insert(valuesToInsert);

    if (insertValuesError) {
      console.error("Error inserting new field values:", insertValuesError);
      return { error: `Failed to insert new field values: ${insertValuesError.message}` };
    }
  }


  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${currentEntityId}`); // Revalidate specific entity page
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${currentEntityId}`);
}

/**
 * Deletes an entity and its associated images.
 * Database CASCADE handles child records.
 */
export async function deleteEntityAction(
  entityId: string,
  gameSlug: string,
  sectionId: string
) {
  const supabase = await createClient();

  // 1. Fetch all image paths for this entity before they are deleted from DB
  const { data: images } = await supabase
    .from("entity_images")
    .select("image_path")
    .eq("entity_id", entityId);

  if (images && images.length > 0) {
    const paths = images
      .map((img) => extractPathFromUrl(img.image_path, "games"))
      .filter(Boolean);

    if (paths.length > 0) {
      await supabase.storage.from("games").remove(paths);
    }
  }

  // 2. Delete the entity itself - CASCADE handles images, skins, and field values in DB
  const { error } = await supabase
    .from("section_entities")
    .delete()
    .eq("id", entityId);

  if (error) {
    console.error("Error deleting entity:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
}
