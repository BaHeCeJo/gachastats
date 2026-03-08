"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { slugify } from "@/lib/utils/slugify";
import { uploadImage, extractPathFromUrl } from "@/lib/supabase/storage-utils";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Handles cover image logic for upserting a game.
 */
async function resolveCoverUrl(
  supabase: SupabaseClient,
  gameId: string | undefined,
  rawName: LocalizedString,
  defaultLang: string,
  rawCoverImage: File | string | null | undefined
): Promise<string | null> {
  let oldCoverPath: string | null = null;
  if (gameId) {
    const { data } = await supabase.from("games").select("cover_url").eq("id", gameId).single();
    oldCoverPath = data?.cover_url || null;
  }

  if (rawCoverImage instanceof File && rawCoverImage.size > 0) {
    const newUrl = await uploadImage(rawCoverImage, "games", "covers");
    if (oldCoverPath) await supabase.storage.from("games").remove([oldCoverPath]);
    return newUrl;
  }
  
  if (typeof rawCoverImage === "string" && rawCoverImage.length > 0) return rawCoverImage;

  if (oldCoverPath) await supabase.storage.from("games").remove([oldCoverPath]);
  return null;
}

export async function upsertGameAction(formData: FormData) {
  const supabase = await createClient();
  const gameId = formData.get("id") as string | undefined;
  const rawName = JSON.parse(formData.get("name") as string) as LocalizedString;
  const defaultLang = formData.get("default_lang") as string;

  if (!rawName[defaultLang as keyof LocalizedString]) return { error: "Name for default language is required." };

  const cover_url = await resolveCoverUrl(supabase, gameId, rawName, defaultLang, formData.get("cover_image"));

  const gameData = {
    name: rawName,
    description: JSON.parse(formData.get("description") as string),
    cover_url,
    default_lang: defaultLang,
    supported_languages: JSON.parse(formData.get("supported_languages") as string),
  };

  if (gameId) {
    const { error } = await supabase.from("games").update(gameData).eq("id", gameId);
    if (error) return { error: error.message };
  } else {
     
    const slug = slugify(rawName[defaultLang as keyof LocalizedString]);
    const { error } = await supabase.from("games").insert({ ...gameData, slug });
    if (error) return { error: error.message };
  }

   
  const finalSlug = gameId ? formData.get("slug") as string : slugify(rawName[defaultLang as keyof LocalizedString]);
  if (finalSlug) updateTag(`game-${finalSlug}`);
  
  revalidatePath("/admin/games");
  revalidatePath("/");
  redirect("/admin/games");
}

export async function deleteGameAction(gameId: string) {
  const supabase = await createClient();
  const [{ data: sections }, { data: game }] = await Promise.all([
    supabase.from("game_sections").select("id, icon_path").eq("game_id", gameId),
    supabase.from("games").select("slug, cover_url").eq("id", gameId).single()
  ]);

  const sectionIds = sections?.map(s => s.id) || [];
  const { data: entities } = await supabase.from("section_entities").select("id").in("section_id", sectionIds);
  const { data: entityImages } = await supabase.from("entity_images").select("image_path").in("entity_id", entities?.map(e => e.id) || []);

  const paths = [
    game?.cover_url,
    ...(sections?.map(s => s.icon_path) || []),
    ...(entityImages?.map(img => img.image_path) || [])
  ].map(p => extractPathFromUrl(p, "games")).filter((p): p is string => !!p);

  if (paths.length) await supabase.storage.from("games").remove(paths);

  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw new Error(error.message);

  sectionIds.forEach(id => updateTag(`section-${id}`));
  if (game?.slug) updateTag(`game-${game.slug}`);

  revalidatePath("/admin/games");
  revalidatePath("/");
  redirect("/admin/games");
}
