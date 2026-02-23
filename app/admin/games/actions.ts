"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "@/lib/utils/slugify";

type GameFormData = {
  id?: string; // Optional for new games
  name: LocalizedString;
  description: LocalizedString;
  cover_image?: File | string | null; // Can be a File object for new upload, string for existing path, or null/undefined
  default_lang: string;
  supported_languages: string[];
};

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

  revalidatePath("/admin/games");
  revalidatePath("/"); // Revalidate home page to show new/updated games
  redirect("/admin/games");
}





/**
 * Deletes a game and all its content by manually cascading through the hierarchy.
 */
export async function deleteGameAction(gameId: string) {
  const supabase = await createClient();

  // 1. Get all sections of this game
  const { data: sections } = await supabase
    .from("game_sections")
    .select("id, icon_path")
    .eq("game_id", gameId);

  if (sections && sections.length > 0) {
    const sectionIds = sections.map(s => s.id);

    // 2. Get all entities in these sections
    const { data: entities } = await supabase
      .from("section_entities")
      .select("id")
      .in("section_id", sectionIds);

    if (entities && entities.length > 0) {
      const entityIds = entities.map(e => e.id);

      // 3. Fetch all images for storage cleanup
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

      // 4. Delete entity-related records
      await supabase.from("entity_images").delete().in("entity_id", entityIds);
      await supabase.from("entity_skins").delete().in("entity_id", entityIds);
      await supabase.from("entity_field_values").delete().in("entity_id", entityIds);
      await supabase.from("section_entities").delete().in("id", entityIds);
    }

    // 5. Cleanup section fields and options
    const { data: fields } = await supabase
      .from("section_fields")
      .select("id")
      .in("section_id", sectionIds);

    if (fields && fields.length > 0) {
      const fieldIds = fields.map(f => f.id);
      await supabase.from("field_options").delete().in("field_id", fieldIds);
      await supabase.from("entity_field_values").delete().in("field_id", fieldIds);
      await supabase.from("section_fields").delete().in("id", fieldIds);
    }

    // 6. Delete section icons from storage
    const iconPaths = sections
      .map((s) => s.icon_path ? extractPathFromUrl(s.icon_path, "games") : null)
      .filter(Boolean) as string[];

    if (iconPaths.length > 0) {
      await supabase.storage.from("games").remove(iconPaths);
    }

    // 7. Delete sections
    await supabase.from("game_sections").delete().in("id", sectionIds);
  }

  // 8. Fetch and delete game cover
  const { data: game } = await supabase
    .from("games")
    .select("cover_url")
    .eq("id", gameId)
    .single();

  if (game?.cover_url) {
    const coverPath = extractPathFromUrl(game.cover_url, "games");
    if (coverPath) {
      await supabase.storage.from("games").remove([coverPath]);
    }
  }

  // 9. Finally delete the game
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId);

  if (error) {
    console.error("Error deleting game:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/games");
  redirect("/admin/games");
}
