"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { slugify } from "@/lib/utils/slugify";
import { uploadImage, extractPathFromUrl } from "@/lib/supabase/storage-utils";

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
  const is_collectible = formData.get("is_collectible") !== "false";
  const is_unique = formData.get("is_unique") !== "false";
  const has_teams = formData.get("has_teams") === "true";
  const max_team_size = Number(formData.get("max_team_size") || 0);
  const max_dupes = Number(formData.get("max_dupes") || 0);
  const min_dupes = Number(formData.get("min_dupes") || 0);
  const dupe_name = JSON.parse(formData.get("dupe_name") as string || '{"en": "Duplicate"}') as LocalizedString;
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
    is_collectible,
    is_unique,
    has_teams,
    max_team_size,
    max_dupes,
    min_dupes,
    dupe_name,
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

  if (sectionId) updateTag(`section-${sectionId}`);
  
  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
}

/**
 * Deletes a section and its associated assets.
 * Database CASCADE handles child records (entities, fields, options, etc.).
 */
export async function deleteSectionAction(
  sectionId: string,
  gameSlug: string
) {
  const supabase = await createClient();

  // 1. Fetch section and its entities in parallel before they are deleted from DB
  const [sectionRes, entitiesRes] = await Promise.all([
    supabase.from("game_sections").select("icon_path").eq("id", sectionId).single(),
    supabase.from("section_entities").select("id").eq("section_id", sectionId)
  ]);

  const section = sectionRes.data;
  const entities = entitiesRes.data || [];
  const entityIds = entities.map(e => e.id);

  // 2. Fetch all image paths for these entities
  const { data: images } = await supabase
    .from("entity_images")
    .select("image_path")
    .in("entity_id", entityIds);

  // 3. Prepare and cleanup storage
  const pathsToDelete: string[] = [];

  if (section?.icon_path) pathsToDelete.push(extractPathFromUrl(section.icon_path, "games"));

  images?.forEach(img => {
    if (img.image_path) pathsToDelete.push(extractPathFromUrl(img.image_path, "games"));
  });

  const validPaths = pathsToDelete.filter(Boolean);

  if (validPaths.length > 0) {
    await supabase.storage.from("games").remove(validPaths);
  }

  // 4. Finally delete the section - database CASCADE handles the rest
  const { error } = await supabase
    .from("game_sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    console.error("Error deleting section:", error);
    throw new Error(error.message);
  }

  updateTag(`section-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
}