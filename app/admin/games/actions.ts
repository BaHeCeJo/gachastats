"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}`);
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
