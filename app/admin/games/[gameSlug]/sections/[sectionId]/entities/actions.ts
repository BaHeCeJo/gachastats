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

  // Then, insert new/updated values
  const valuesToInsert = fieldValues.map((val: any) => ({
    entity_id: currentEntityId,
    field_id: val.field_id,
    value_text: val.value_text, // This is already LocalizedString if from LocalizedTextInput
    option_id: val.option_id || null,
  }));

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
 * Deletes an entity and all its associated records and images.
 */
export async function deleteEntityAction(
  entityId: string,
  gameSlug: string,
  sectionId: string
) {
  const supabase = await createClient();

  // 1. Fetch all image paths for this entity
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

  // 2. Delete related records manually to avoid FK constraint errors
  await supabase.from("entity_images").delete().eq("entity_id", entityId);
  await supabase.from("entity_skins").delete().eq("entity_id", entityId);
  await supabase.from("entity_field_values").delete().eq("entity_id", entityId);

  // 3. Delete the entity itself
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
