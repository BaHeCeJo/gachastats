"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeDbError } from "@/lib/utils/errors";

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === 'admin';
}

async function resolveGameField(
  supabase: SupabaseClient,
  gameId: string,
  gameFieldId: string | undefined,
  internalName: string,
  manual_fill: boolean,
  has_icon: boolean,
  has_color: boolean
): Promise<string> {
  if (gameFieldId) {
    const { error } = await supabase.from("game_fields").update({ internal_name: internalName, manual_fill, has_icon, has_color }).eq("id", gameFieldId);
    if (error) throw new Error("Failed to update game field.");
    return gameFieldId;
  }

  const { data: existing } = await supabase.from("game_fields").select("id").eq("game_id", gameId).eq("internal_name", internalName).single();
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase.from("game_fields").insert({ game_id: gameId, internal_name: internalName, manual_fill, has_icon, has_color }).select("id").single();
  if (createError) throw new Error("Failed to create game field.");
  return created.id;
}

export async function upsertFieldAction(gameSlug: string, sectionId: string, gameDefaultLang: string, formData: FormData) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("id").eq("slug", gameSlug).single();
  if (!game) return { error: "Game not found." };

  const rawKey = JSON.parse(formData.get("key") as string) as LocalizedString;
  if (!rawKey[gameDefaultLang as keyof LocalizedString]) return { error: "Key for default language is required." };

  const internalName = rawKey.en || rawKey[gameDefaultLang as keyof LocalizedString];
  const fieldId = formData.get("id") as string | undefined;

  try {
    const gameFieldId = await resolveGameField(
      supabase,
      game.id,
      formData.get("game_field_id") as string | undefined,
      internalName,
      formData.get("manual_fill") === 'on',
      formData.get("has_icon") === 'on',
      formData.get("has_color") === 'on'
    );

    const sectionFieldData = {
      section_id: sectionId,
      game_field_id: gameFieldId,
      key: rawKey,
      category: (formData.get("category") as string)?.trim() || 'General',
      required: formData.get("required") === 'on',
      is_multi: formData.get("is_multi") === 'on',
      order_index: Number(formData.get("order_index") || 0),
    };

    const query = fieldId ? supabase.from("section_fields").update(sectionFieldData).eq("id", fieldId) : supabase.from("section_fields").insert(sectionFieldData);
    const { error } = await query;
    if (error) return { error: sanitizeDbError(error, "upsertField") };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "An unknown error occurred";
    return { error: message };
  }

  updateTag(`section-fields-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}`, 'layout');
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
}

export async function deleteFieldAction(fieldId: string, gameSlug: string, sectionId: string) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { error } = await supabase.from("section_fields").delete().eq("id", fieldId);
  if (error) throw new Error("Failed to delete field. Please try again.");

  updateTag(`section-fields-${sectionId}`);
  revalidatePath(`/admin/games/${gameSlug}`, 'layout');
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
}
