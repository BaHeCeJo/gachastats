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
    has_stats: formData.get("has_stats") === "true",
    has_ascension: formData.get("has_ascension") === "true",
    max_level: Number(formData.get("max_level") || 1),
  };

  const query = sectionId ? supabase.from("game_sections").update(sectionData).eq("id", sectionId) : supabase.from("game_sections").insert(sectionData);
  const { error } = await query;
  if (error) return { error: `Failed to save section: ${error.message}` };

  updateTag(`section-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}/sections`);
  redirect(`/admin/games/${gameSlug}/sections`);
  }

  export async function upsertSectionStatAction(sectionId: string, formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string | undefined;
  const key = formData.get("key") as string;
  const name = JSON.parse(formData.get("name") as string) as LocalizedString;
  const order_index = Number(formData.get("order_index") || 0);
  const is_scalable = formData.get("is_scalable") === "true";

  const statData = { section_id: sectionId, key, name, order_index, is_scalable };

  const query = id ? supabase.from("section_stats").update(statData).eq("id", id) : supabase.from("section_stats").insert(statData);
  const { error } = await query;
  if (error) return { error: `Failed to save stat: ${error.message}` };

  updateTag(`section-stats-${sectionId}`);
  return { success: true };
  }

  export async function deleteSectionStatAction(sectionId: string, statId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("section_stats").delete().eq("id", statId);
  if (error) return { error: `Failed to delete stat: ${error.message}` };

  updateTag(`section-stats-${sectionId}`);
  return { success: true };
  }

  export async function upsertSectionAscensionAction(sectionId: string, formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string | undefined;
  const phase_index = Number(formData.get("phase_index"));
  const min_level = Number(formData.get("min_level"));
  const max_level = Number(formData.get("max_level"));

  const ascensionData = { section_id: sectionId, phase_index, min_level, max_level };

  const query = id ? supabase.from("section_ascensions").update(ascensionData).eq("id", id) : supabase.from("section_ascensions").insert(ascensionData);
  const { error } = await query;
  if (error) return { error: `Failed to save ascension phase: ${error.message}` };

  updateTag(`section-ascensions-${sectionId}`);
  return { success: true };
  }

  export async function deleteSectionAscensionAction(sectionId: string, ascensionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("section_ascensions").delete().eq("id", ascensionId);
  if (error) return { error: `Failed to delete ascension phase: ${error.message}` };

  updateTag(`section-ascensions-${sectionId}`);
  return { success: true };
  }

  export async function upsertAbilityTemplateAction(sectionId: string, formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string | undefined;
  const name = JSON.parse(formData.get("name") as string) as LocalizedString;
  const is_default = formData.get("is_default") === "true";
  const order_index = Number(formData.get("order_index") || 0);

  const data = { section_id: sectionId, name, is_default, order_index };
  const query = id ? supabase.from("section_ability_templates").update(data).eq("id", id) : supabase.from("section_ability_templates").insert(data);
  
  const { error } = await query;
  if (error) return { error: error.message };

  updateTag(`section-ability-templates-${sectionId}`);
  return { success: true };
}

export async function deleteAbilityTemplateAction(sectionId: string, templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("section_ability_templates").delete().eq("id", templateId);
  if (error) return { error: error.message };

  updateTag(`section-ability-templates-${sectionId}`);
  return { success: true };
}

export async function upsertAbilityDefinitionAction(sectionId: string, templateId: string, formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string | undefined;
  const name = JSON.parse(formData.get("name") as string) as LocalizedString;
  const order_index = Number(formData.get("order_index") || 0);
  const max_level = Number(formData.get("max_level") || 1);

  const data = { template_id: templateId, name, order_index, max_level };
  const query = id ? supabase.from("section_ability_definitions").update(data).eq("id", id) : supabase.from("section_ability_definitions").insert(data);
  
  const { error } = await query;
  if (error) return { error: error.message };

  updateTag(`section-ability-templates-${sectionId}`);
  return { success: true };
}

export async function deleteAbilityDefinitionAction(sectionId: string, definitionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("section_ability_definitions").delete().eq("id", definitionId);
  if (error) return { error: error.message };

  updateTag(`section-ability-templates-${sectionId}`);
  return { success: true };
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
