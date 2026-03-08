"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { v4 as uuidv4 } from "uuid";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Extracts the storage path from a public URL.
 */
function extractPathFromUrl(url: string, bucket: string): string {
  if (!url || !url.startsWith("http")) return url || "";
  const searchStr = `/${bucket}/`;
  const parts = url.split(searchStr);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/**
 * Handles uploading an image file to Supabase storage.
 */
async function uploadOptionImage(supabase: SupabaseClient, file: File, bucket: string, folder: string): Promise<string> {
  const fileExtension = file.name.split(".").pop();
  const path = `${folder}/${uuidv4()}.${fileExtension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/**
 * Resolves the icon path for an option, handling uploads and old image deletion.
 */
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
    const newPath = await uploadOptionImage(supabase, iconFile, "games", `${gameSlug}/fields/${gameFieldId}/options`);
    if (oldPath && oldPath !== newPath) await supabase.storage.from("games").remove([oldPath]);
    return newPath;
  }
  
  if (existingIconPath && existingIconPath !== "null") return existingIconPath;
  if (oldPath) await supabase.storage.from("games").remove([oldPath]);
  return null;
}

export async function upsertOptionAction(gameSlug: string, sectionId: string, fieldId: string, gameDefaultLang: string, formData: FormData) {
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
    if (error) return { error: `Failed to save option: ${error.message}` };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "An unknown error occurred" };
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
}

export async function deleteOptionAction(optionId: string, gameSlug: string, sectionId: string, fieldId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("field_options").select("icon_path").eq("id", optionId).single();
  if (data?.icon_path) {
    const path = extractPathFromUrl(data.icon_path, "games");
    if (path) await supabase.storage.from("games").remove([path]);
  }
  const { error } = await supabase.from("field_options").delete().eq("id", optionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
}
