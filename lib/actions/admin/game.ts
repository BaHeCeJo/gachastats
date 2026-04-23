"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/supabase/queries";
import { slugify } from "@/lib/utils/slugify";
import { smartUpdateImage, deleteAssets } from "@/lib/services/storage.service";
import { sanitizeDbError } from "@/lib/utils/errors";

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === 'admin';
}

export async function upsertGameAction(formData: FormData) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const supabase = await createClient();

  const gameId = formData.get("id") as string | undefined;
  const rawName = JSON.parse(formData.get("name") as string) as LocalizedString;
  const rawDescription = JSON.parse(formData.get("description") as string) as LocalizedString;
  const rawCoverImage = formData.get("cover_image");
  const defaultLang = formData.get("default_lang") as string;
  const supportedLanguages = JSON.parse(formData.get("supported_languages") as string) as string[];

  // eslint-disable-next-line security/detect-object-injection
  if (!rawName[defaultLang]) {
    return { error: `Name for default language (${defaultLang.toUpperCase()}) is required.` };
  }

  let oldCoverPath: string | null = null;
  if (gameId) {
    const { data: existingGame } = await supabase.from("games").select("cover_url").eq("id", gameId).single();
    oldCoverPath = existingGame?.cover_url || null;
  }

  const cover_url = await smartUpdateImage(rawCoverImage as File | string | null, oldCoverPath, "games", "covers");

  const gameData = {
    name: rawName,
    description: rawDescription,
    cover_url: cover_url,
    default_lang: defaultLang,
    supported_languages: supportedLanguages,
  };

  if (gameId) {
    const { error } = await supabase.from("games").update(gameData).eq("id", gameId);
    if (error) return { error: sanitizeDbError(error, "upsertGame/update") };
  } else {
    // eslint-disable-next-line security/detect-object-injection
    const slug = slugify(rawName[defaultLang]);
    const { error } = await supabase.from("games").insert({ ...gameData, slug });
    if (error) return { error: sanitizeDbError(error, "upsertGame/insert") };
  }

  // eslint-disable-next-line security/detect-object-injection
  const slug = gameId ? formData.get("slug") as string : slugify(rawName[defaultLang]);
  if (slug) updateTag(`game-${slug}`);
  
  revalidatePath("/admin/games");
  revalidatePath("/");
  redirect("/admin/games");
}

export async function deleteGameAction(gameId: string) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  const supabase = await createClient();

  const [sectionsRes, gameRes] = await Promise.all([
    supabase.from("game_sections").select("id, icon_path").eq("game_id", gameId),
    supabase.from("games").select("slug, cover_url").eq("id", gameId).single()
  ]);

  const sections = sectionsRes.data || [];
  const sectionIds = sections.map(s => s.id);
  const game = gameRes.data;

  const { data: entities } = await supabase.from("section_entities").select("id").in("section_id", sectionIds);
  const entityIds = entities?.map(e => e.id) || [];
  
  const { data: entityImages } = await supabase.from("entity_images").select("image_path").in("entity_id", entityIds);

  const pathsToDelete = [
    game?.cover_url,
    ...sections.map(s => s.icon_path),
    ...(entityImages?.map(img => img.image_path) || [])
  ];

  await deleteAssets(pathsToDelete, "games");

  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw new Error(error.message);

  sectionIds.forEach(id => updateTag(`section-${id}`));
  if (game?.slug) updateTag(`game-${game.slug}`);

  revalidatePath("/admin/games");
  revalidatePath("/");
  redirect("/admin/games");
}
