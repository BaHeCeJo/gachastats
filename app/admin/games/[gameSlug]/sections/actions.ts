"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { slugify } from "@/lib/utils/slugify";
import { uploadImage, extractPathFromUrl } from "@/lib/supabase/storage-utils";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Handles icon path resolution for a section.
 */
async function resolveSectionIcon(
  supabase: SupabaseClient,
  sectionId: string | undefined,
  rawKey: LocalizedString,
  defaultLang: string,
  gameSlug: string,
  iconFile: File | string | null | undefined,
  existingIconPath: string | null
): Promise<string | null> {
  let oldIconPath = existingIconPath;
  if (sectionId && !iconFile && !existingIconPath) {
    const { data } = await supabase.from("game_sections").select("icon_path").eq("id", sectionId).single();
    if (data?.icon_path) oldIconPath = extractPathFromUrl(data.icon_path, "games");
  }

  if (iconFile instanceof File && iconFile.size > 0) {
     
    const sectionSlug = slugify(rawKey[defaultLang as keyof LocalizedString] || "");
    const newPath = await uploadImage(iconFile, "games", `${gameSlug}/sections/${sectionSlug}`);
    if (oldIconPath && oldIconPath !== newPath) await supabase.storage.from("games").remove([oldIconPath]);
    return newPath;
  }
  
  if (existingIconPath && existingIconPath !== "null") return existingIconPath;
  if (oldIconPath) await supabase.storage.from("games").remove([oldIconPath]);
  return null;
}

export async function upsertSectionAction(gameId: string, gameSlug: string, gameDefaultLang: string, formData: FormData) {
  const supabase = await createClient();
  const sectionId = formData.get("id") as string | undefined;
  const rawKey = JSON.parse(formData.get("key") as string) as LocalizedString;

  if (!rawKey[gameDefaultLang as keyof LocalizedString]) return { error: "Key for default language is required." };

  const icon_path = await resolveSectionIcon(supabase, sectionId, rawKey, gameDefaultLang, gameSlug, formData.get("icon_file") as File | null, formData.get("existing_icon_path") as string | null);

  const sectionData = {
    key: rawKey,
    color: formData.get("color") as string,
    order_index: Number(formData.get("order_index")),
    is_collectible: formData.get("is_collectible") !== "false",
    is_unique: formData.get("is_unique") !== "false",
    has_teams: formData.get("has_teams") === "true",
    max_team_size: Number(formData.get("max_team_size") || 0),
    max_dupes: Number(formData.get("max_dupes") || 0),
    min_dupes: Number(formData.get("min_dupes") || 0),
    dupe_name: JSON.parse(formData.get("dupe_name") as string || '{"en": "Duplicate"}'),
    skin_image_types: JSON.parse(formData.get("skin_image_types") as string || '["icon", "splashart"]'),
    icon_path,
    game_id: gameId,
  };

  const query = sectionId ? supabase.from("game_sections").update(sectionData).eq("id", sectionId) : supabase.from("game_sections").insert(sectionData);
  const { error } = await query;
  if (error) return { error: `Failed to save section: ${error.message}` };

  if (sectionId) updateTag(`section-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
}

export async function deleteSectionAction(sectionId: string, gameSlug: string) {
  const supabase = await createClient();
  const [{ data: section }, { data: entities }] = await Promise.all([
    supabase.from("game_sections").select("icon_path").eq("id", sectionId).single(),
    supabase.from("section_entities").select("id").eq("section_id", sectionId)
  ]);

  const { data: images } = await supabase.from("entity_images").select("image_path").in("entity_id", entities?.map(e => e.id) || []);
  const paths = [section?.icon_path, ...(images?.map(img => img.image_path) || [])].map(p => extractPathFromUrl(p, "games")).filter((p): p is string => !!p);

  if (paths.length) await supabase.storage.from("games").remove(paths);

  const { error } = await supabase.from("game_sections").delete().eq("id", sectionId);
  if (error) throw new Error(error.message);

  updateTag(`section-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
}
