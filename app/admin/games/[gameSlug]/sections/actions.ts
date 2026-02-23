"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "@/lib/utils/slugify";

/**
 * Extracts the storage path from a public URL.
 * Supabase URLs are typically: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
 */
function extractPathFromUrl(url: string, bucket: string): string {
  if (!url) return "";
  // If it's already a relative path (doesn't start with http), return as is
  if (!url.startsWith("http")) return url;
  
  const searchStr = `/${bucket}/`;
  if (!url.includes(searchStr)) return ""; 
  
  const parts = url.split(searchStr);
  return parts[parts.length - 1];
}

/**
 * Handles uploading an image file to Supabase storage.
 * @param file The image file to upload.
 * @param bucket The storage bucket name.
 * @param folder The folder within the bucket.
 * @returns The path to the uploaded file within the bucket/folder.
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
 * Upserts (creates or updates) a section entry.
 */
export async function upsertSectionAction(
  gameId: string,
  gameSlug: string,
  gameDefaultLang: string,
  formData: FormData
) {
  const supabase = await createClient();

  const sectionId = formData.get("id") as string | undefined;
  const rawKey = JSON.parse(formData.get("key") as string) as LocalizedString;
  const color = (formData.get("color") as string);
  const order_index = Number(formData.get("order_index"));
  const iconFile = formData.get("icon_file"); // File or null
  const existingIconPath = formData.get("existing_icon_path") as string | null;

  if (!rawKey[gameDefaultLang]) {
    return { error: `Key for default language (${gameDefaultLang.toUpperCase()}) is required.` };
  }

  let icon_path: string | null = null;
  let oldIconPath: string | null = existingIconPath; // Assume existing path by default

  if (sectionId && !iconFile && !existingIconPath) {
    // If updating, no new file, and no existing path passed (meaning it was removed)
    // Fetch current icon_path to potentially delete
    const { data: currentSection, error: fetchError } = await supabase
      .from("game_sections")
      .select("icon_path")
      .eq("id", sectionId)
      .single();

    if (fetchError) {
      console.error("Error fetching current section for icon management:", fetchError);
      return { error: `Failed to fetch current section icon: ${fetchError.message}` };
    }
    if (currentSection?.icon_path) {
      oldIconPath = extractPathFromUrl(currentSection.icon_path, "games");
    }
  }


  // Handle icon file upload/deletion
  if (iconFile instanceof File && iconFile.size > 0) {
    // New file uploaded
    const sectionSlug = slugify(rawKey[gameDefaultLang]);
    icon_path = await uploadImage(iconFile, "games", `${gameSlug}/sections/${sectionSlug}`);
    // If there was an old icon, delete it
    if (oldIconPath && oldIconPath !== icon_path) { // Only delete if it's different from newly uploaded
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

  const sectionData = {
    key: rawKey,
    color,
    order_index,
    icon_path: icon_path,
    game_id: gameId,
  };

  if (sectionId) {
    // Update existing section
    const { error } = await supabase
      .from("game_sections")
      .update(sectionData)
      .eq("id", sectionId);

    if (error) {
      console.error("Error updating section:", error);
      return { error: `Failed to update section: ${error.message}` };
    }
  } else {
    // Create new section
    const { error } = await supabase
      .from("game_sections")
      .insert(sectionData);

    if (error) {
      console.error("Error creating section:", error);
      return { error: `Failed to create section: ${error.message}` };
    }
  }

  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
}

/**
 * Deletes a section and all its associated records (entities, fields, options, images).
 */
export async function deleteSectionAction(
  sectionId: string,
  gameSlug: string
) {
  const supabase = await createClient();

  // 1. Get all entities in this section
  const { data: entities } = await supabase
    .from("section_entities")
    .select("id")
    .eq("section_id", sectionId);

  if (entities && entities.length > 0) {
    const entityIds = entities.map(e => e.id);
    
    // Cleanup images in storage
    const { data: images } = await supabase
      .from("entity_images")
      .select("image_path")
      .in("entity_id", entityIds);

    if (images && images.length > 0) {
      const paths = images
        .map((img) => extractPathFromUrl(img.image_path, "games"))
        .filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("games").remove(paths);
      }
    }

    // Cleanup entity records
    await supabase.from("entity_images").delete().in("entity_id", entityIds);
    await supabase.from("entity_skins").delete().in("entity_id", entityIds);
    await supabase.from("entity_field_values").delete().in("entity_id", entityIds);
    await supabase.from("section_entities").delete().in("id", entityIds);
  }

  // 2. Get all fields in this section
  const { data: fields } = await supabase
    .from("section_fields")
    .select("id")
    .eq("section_id", sectionId);

  if (fields && fields.length > 0) {
    const fieldIds = fields.map(f => f.id);
    // Cleanup field options
    await supabase.from("field_options").delete().in("field_id", fieldIds);
    // Cleanup field values linked to these fields (already partially done via entities, but just in case)
    await supabase.from("entity_field_values").delete().in("field_id", fieldIds);
    // Cleanup fields
    await supabase.from("section_fields").delete().in("id", fieldIds);
  }

  // 3. Fetch section icon path and cleanup storage
  const { data: section } = await supabase
    .from("game_sections")
    .select("icon_path")
    .eq("id", sectionId)
    .single();

  if (section?.icon_path) {
    const path = extractPathFromUrl(section.icon_path, "games");
    if (path) {
      await supabase.storage.from("games").remove([path]);
    }
  }

  // 4. Finally delete the section
  const { error } = await supabase
    .from("game_sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    console.error("Error deleting section:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
}