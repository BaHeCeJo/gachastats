"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { LocalizedString } from "@/lib/localization";
import { uploadImage } from "@/lib/supabase/storage-utils";
import { deleteAssets } from "@/lib/services/storage.service";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upserts (creates or updates) a skin entry.
 */
export async function upsertSkin(
  gameSlug: string,
  sectionId: string,
  entityId: string,
  gameDefaultLang: string,
  formData: FormData
) {
  const supabase = await createClient();
  const skinId = formData.get("id") as string | undefined;
  const rawName = JSON.parse(formData.get("name") as string) as LocalizedString;
  const isDefault = formData.get("is_default") === "true";

   
  if (!rawName[gameDefaultLang as keyof LocalizedString]) return { error: "Name for default language is required." };

  const data = { entity_id: entityId, name: rawName, is_default: isDefault };
  const query = skinId ? supabase.from("entity_skins").update(data).eq("id", skinId) : supabase.from("entity_skins").insert(data);
  const { error } = await query;
  if (error) return { error: `Failed to save skin: ${error.message}` };

  if (isDefault) await supabase.from("entity_skins").update({ is_default: false }).eq("entity_id", entityId).neq("id", skinId || null);

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
  return { error: undefined };
}

/**
 * Handles image data synchronization for a skin.
 */
async function syncSkinImage(
  supabase: SupabaseClient,
  entityId: string,
  skinId: string,
  imageType: string,
  imageUrl: string
) {
  const { data: existing } = await supabase.from("entity_images").select("id, image_path").eq("skin_id", skinId).eq("type", imageType).single();

  if (existing) {
    const { error } = await supabase.from("entity_images").update({ image_path: imageUrl }).eq("id", existing.id);
    if (error) throw new Error(`Update failed: ${error.message}`);
    if (existing.image_path && existing.image_path !== imageUrl) await deleteAssets([existing.image_path], "games");
  } else {
    const { error } = await supabase.from("entity_images").insert({ entity_id: entityId, skin_id: skinId, type: imageType, image_path: imageUrl });
    if (error) throw new Error(`Insert failed: ${error.message}`);
  }
}

/**
 * Upserts (creates or updates) a skin image (icon or splashart).
 */
export async function upsertSkinImage(gameSlug: string, sectionId: string, entityId: string, skinId: string, formData: FormData) {
  const supabase = await createClient();
  const type = formData.get("imageType") as string;
  const file = formData.get("image_file") as File;

  if (!file?.size) return { error: "No image file provided." };
  if (!type) return { error: "Image type is required." };

  try {
    const folder = `${gameSlug}/sections/${sectionId}/entities/${entityId}/skins/${skinId}`;
    const url = await uploadImage(file, "games", folder);
    await syncSkinImage(supabase, entityId, skinId, type, url);
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "An unknown error occurred" };
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
  return { error: undefined };
}

export async function deleteSkin(skinId: string, entityId: string, gameSlug: string, sectionId: string) {
  const supabase = await createClient();
  const { data: images } = await supabase.from("entity_images").select("image_path").eq("skin_id", skinId);
  if (images?.length) await deleteAssets(images.map(i => i.image_path).filter((p): p is string => !!p), "games");

  const { error } = await supabase.from("entity_skins").delete().eq("id", skinId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
}

export async function deleteSkinImage(imageId: string, imagePath: string, gameSlug: string, sectionId: string, entityId: string) {
  const supabase = await createClient();
  let path = imagePath;
  if (path.startsWith("http")) path = path.split("/games/")[1] || path;
  await deleteAssets([path], "games");
  await supabase.from("entity_images").delete().eq("id", imageId);
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
}
