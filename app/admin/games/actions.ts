"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { slugify } from "@/lib/utils/slugify";
import { uploadImage, extractPathFromUrl } from "@/lib/supabase/storage-utils";

/**
 * Upserts (creates or updates) a game entry.
 */
export async function upsertGameAction(formData: FormData) {
  const supabase = await createClient();

  const gameId = formData.get("id") as string | undefined;
  const rawName = JSON.parse(formData.get("name") as string) as LocalizedString;
  const rawDescription = JSON.parse(formData.get("description") as string) as LocalizedString;
  const rawCoverImage = formData.get("cover_image"); // File, string path, or null
  const defaultLang = formData.get("default_lang") as string;
  const supportedLanguages = JSON.parse(formData.get("supported_languages") as string) as string[];

  // Basic validation (more comprehensive validation would be needed)
  if (!rawName[defaultLang]) {
    return { error: `Name for default language (${defaultLang.toUpperCase()}) is required.` };
  }

  let cover_url: string | null = null;
  let oldCoverPath: string | null = null; // To track if an old image needs deletion

  // Fetch existing game data if updating
  if (gameId) {
    const { data: existingGame, error: fetchError } = await supabase
      .from("games")
      .select("cover_url")
      .eq("id", gameId)
      .single();

    if (fetchError) {
      console.error("Error fetching existing game for update:", fetchError);
      return { error: `Failed to fetch existing game: ${fetchError.message}` };
    }
    oldCoverPath = existingGame?.cover_url || null;
  }

  // Handle cover image upload/deletion
  if (rawCoverImage instanceof File && rawCoverImage.size > 0) {
    // New file uploaded
    cover_url = await uploadImage(rawCoverImage, "games", "covers");
    // If there was an old cover, delete it
    if (oldCoverPath) {
      await supabase.storage.from("games").remove([oldCoverPath]);
    }
  } else if (typeof rawCoverImage === "string" && rawCoverImage.length > 0) {
    // Existing image path was retained, no new upload
    cover_url = rawCoverImage;
  } else {
    // Image was removed or never existed
    cover_url = null;
    // If there was an old cover, delete it
    if (oldCoverPath) {
      await supabase.storage.from("games").remove([oldCoverPath]);
    }
  }

  const gameData = {
    name: rawName,
    description: rawDescription,
    cover_url: cover_url,
    default_lang: defaultLang,
    supported_languages: supportedLanguages,
  };

  if (gameId) {
    // Update existing game
    const { error } = await supabase
      .from("games")
      .update(gameData)
      .eq("id", gameId);

    if (error) {
      console.error("Error updating game:", error);
      return { error: `Failed to update game: ${error.message}` };
    }
  } else {
    // Create new game
    const { error } = await supabase
      .from("games")
      .insert({
        ...gameData,
        slug: slugify(rawName[defaultLang]), // Slug from default language name
      });

    if (error) {
      console.error("Error creating game:", error);
      return { error: `Failed to create game: ${error.message}` };
    }
  }

  const slug = gameId ? formData.get("slug") as string : slugify(rawName[defaultLang]);
  if (slug) updateTag(`game-${slug}`);
  
  revalidatePath("/admin/games");
  revalidatePath("/"); // Revalidate home page to show new/updated games
  redirect("/admin/games");
}





/**
 * Deletes a game and its associated storage assets.
 * Child records are deleted automatically by the database CASCADE.
 */
export async function deleteGameAction(gameId: string) {
  const supabase = await createClient();

  // 1. Fetch all asset paths for cleanup in parallel BEFORE deleting the records
  const [sectionsRes, gameRes] = await Promise.all([
    supabase.from("game_sections").select("id, icon_path").eq("game_id", gameId),
    supabase.from("games").select("slug, cover_url").eq("id", gameId).single()
  ]);

  const sections = sectionsRes.data || [];
  const sectionIds = sections.map(s => s.id);
  const game = gameRes.data;

  // 2. Fetch entities and then their images
  const { data: entities } = await supabase
    .from("section_entities")
    .select("id")
    .in("section_id", sectionIds);

  const entityIds = entities?.map(e => e.id) || [];
  
  const { data: entityImages } = await supabase
    .from("entity_images")
    .select("image_path")
    .in("entity_id", entityIds);

  // 3. Prepare paths for storage cleanup
  const pathsToDelete: string[] = [];
  
  if (game?.cover_url) pathsToDelete.push(extractPathFromUrl(game.cover_url, "games"));
  
  sections.forEach(s => {
    if (s.icon_path) pathsToDelete.push(extractPathFromUrl(s.icon_path, "games"));
  });

  entityImages?.forEach(img => {
    if (img.image_path) pathsToDelete.push(extractPathFromUrl(img.image_path, "games"));
  });

  const validPaths = pathsToDelete.filter(Boolean);

  // 4. Delete from storage and DB in parallel (storage first to be safe, or both)
  if (validPaths.length > 0) {
    await supabase.storage.from("games").remove(validPaths);
  }

  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId);

  if (error) {
    console.error("Error deleting game:", error);
    throw new Error(error.message);
  }

  // Revalidate tags for all deleted sections
  sectionIds.forEach(id => updateTag(`section-${id}`));
  if (game?.slug) updateTag(`game-${game.slug}`);

  revalidatePath("/admin/games");
  revalidatePath("/");
  redirect("/admin/games");
}
