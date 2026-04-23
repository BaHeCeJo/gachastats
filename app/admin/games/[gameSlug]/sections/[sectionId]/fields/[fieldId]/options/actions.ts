"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadImage, extractPathFromUrl } from "@/lib/supabase/storage-utils";
import { sanitizeDbError } from "@/lib/utils/errors";

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === 'admin';
}

async function resolveOptionIcon(
  supabase: SupabaseClient,
  optionId: string | undefined,
  gameFieldId: string,
  gameSlug: string,
  iconFile: File | string | null | undefined,
  existingIconPath: string | null
): Promise<string | null> {
  let oldPath = existingIconPath;
  if (optionId && !iconFile && !existingIconPath) {
    const { data } = await supabase.from("field_options").select("icon_path").eq("id", optionId).single();
    if (data?.icon_path) oldPath = extractPathFromUrl(data.icon_path, "games");
  }

  if (iconFile instanceof File && iconFile.size > 0) {
    const newPath = await uploadImage(iconFile, "games", `${gameSlug}/fields/${gameFieldId}/options`);
    if (oldPath && oldPath !== newPath) await supabase.storage.from("games").remove([oldPath]);
    return newPath;
  }

  if (existingIconPath && existingIconPath !== "null") return existingIconPath;
  if (oldPath) await supabase.storage.from("games").remove([oldPath]);
  return null;
}

export async function upsertOptionAction(gameSlug: string, sectionId: string, fieldId: string, gameDefaultLang: string, formData: FormData) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const supabase = await createClient();
  const { data: sectionField } = await supabase.from("section_fields").select("game_field_id").eq("id", fieldId).single();
  if (!sectionField) return { error: "Field not found." };

  const gameFieldId = sectionField.game_field_id;
  const rawValueKey = JSON.parse(formData.get("value_key") as string) as LocalizedString;
  const optionId = formData.get("id") as string | undefined;

  if (!rawValueKey[gameDefaultLang as keyof LocalizedString]) return { error: "Value Key for default language is required." };

  try {
    const icon_path = await resolveOptionIcon(supabase, optionId, gameFieldId, gameSlug, formData.get("icon_file") as File | string | null, formData.get("existing_icon_path") as string | null);
    const data = { game_field_id: gameFieldId, value_key: rawValueKey, color: formData.get("color") as string, order_index: Number(formData.get("order_index") || 0), icon_path };
    const query = optionId ? supabase.from("field_options").update(data).eq("id", optionId) : supabase.from("field_options").insert(data);
    const { error } = await query;
    if (error) return { error: sanitizeDbError(error, "upsertOption") };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "An unknown error occurred" };
  }

  const { data: affectedSections } = await supabase.from("section_fields").select("section_id").eq("game_field_id", gameFieldId);
  if (affectedSections) {
    affectedSections.forEach(s => updateTag(`section-fields-${s.section_id}`));
  }

  updateTag('field-options');
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
}

export async function deleteOptionAction(optionId: string, gameSlug: string, sectionId: string, fieldId: string) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { data: optData } = await supabase.from("field_options").select("icon_path, game_field_id").eq("id", optionId).single();
  if (optData?.icon_path) {
    const path = extractPathFromUrl(optData.icon_path, "games");
    if (path) await supabase.storage.from("games").remove([path]);
  }
  const gameFieldId = optData?.game_field_id;

  const { error } = await supabase.from("field_options").delete().eq("id", optionId);
  if (error) throw new Error("Failed to delete option. Please try again.");

  if (gameFieldId) {
    const { data: affectedSections } = await supabase.from("section_fields").select("section_id").eq("game_field_id", gameFieldId);
    if (affectedSections) {
      affectedSections.forEach(s => updateTag(`section-fields-${s.section_id}`));
    }
  }

  updateTag('field-options');
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
}
