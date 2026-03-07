"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/types";
import { slugify } from "@/lib/utils/slugify";
import { smartUpdateImage, deleteAssets } from "@/lib/services/storage.service";

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === 'admin';
}

export async function upsertSectionAction(
  gameId: string,
  gameSlug: string,
  gameDefaultLang: string,
  formData: FormData
) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
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
  const iconFile = formData.get("icon_file");
  const existingIconPath = formData.get("existing_icon_path") as string | null;

  if (!rawKey[gameDefaultLang]) {
    return { error: `Key for default language (${gameDefaultLang.toUpperCase()}) is required.` };
  }

  let oldIconPath: string | null = existingIconPath;
  if (sectionId && !iconFile && !existingIconPath) {
    const { data: currentSection } = await supabase.from("game_sections").select("icon_path").eq("id", sectionId).single();
    oldIconPath = currentSection?.icon_path || null;
  }

  const sectionSlug = slugify(rawKey[gameDefaultLang]);
  const icon_path = await smartUpdateImage(iconFile as File | string | null, oldIconPath, "games", `${gameSlug}/sections/${sectionSlug}`);

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
    const { error } = await supabase.from("game_sections").update(sectionData).eq("id", sectionId);
    if (error) return { error: `Failed to update section: ${error.message}` };
  } else {
    const { error } = await supabase.from("game_sections").insert(sectionData);
    if (error) return { error: `Failed to create section: ${error.message}` };
  }

  if (sectionId) updateTag(`section-${sectionId}`);
  
  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
}

export async function deleteSectionAction(
  sectionId: string,
  gameSlug: string
) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  const supabase = await createClient();

  const [sectionRes, entitiesRes] = await Promise.all([
    supabase.from("game_sections").select("icon_path").eq("id", sectionId).single(),
    supabase.from("section_entities").select("id").eq("section_id", sectionId)
  ]);

  const section = sectionRes.data;
  const entities = entitiesRes.data || [];
  const entityIds = entities.map(e => e.id);

  const { data: images } = await supabase.from("entity_images").select("image_path").in("entity_id", entityIds);

  const pathsToDelete = [
    section?.icon_path,
    ...(images?.map(img => img.image_path) || [])
  ];

  await deleteAssets(pathsToDelete, "games");

  const { error } = await supabase.from("game_sections").delete().eq("id", sectionId);
  if (error) throw new Error(error.message);

  updateTag(`section-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
}

