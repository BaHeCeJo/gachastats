"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";

/**
 * Upserts (creates or updates) a field entry.
 */
export async function upsertFieldAction(
  gameSlug: string,
  sectionId: string,
  gameDefaultLang: string,
  formData: FormData
) {
  const supabase = await createClient();

  // Get Game ID first
  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", gameSlug)
    .single();

  if (!game) return { error: "Game not found." };

  const fieldId = formData.get("id") as string | undefined;
  const gameFieldIdFromForm = formData.get("game_field_id") as string | undefined;
  const rawKey = JSON.parse(formData.get("key") as string) as LocalizedString;
  const category = (formData.get("category") as string)?.trim() || 'General';
  const required = formData.get("required") === 'on';
  const manual_fill = formData.get("manual_fill") === 'on';
  const has_icon = formData.get("has_icon") === 'on';
  const has_color = formData.get("has_color") === 'on';
  const is_multi = formData.get("is_multi") === 'on';
  const order_index = Number(formData.get("order_index") || 0);

  if (!rawKey[gameDefaultLang]) {
    return { error: `Key for default language (${gameDefaultLang.toUpperCase()}) is required.` };
  }

  const internalName = rawKey['en'] || rawKey[gameDefaultLang];

  let gameFieldId = gameFieldIdFromForm;

  // 1. Handle Game Field (The Concept)
  if (gameFieldId) {
    // Update existing game field core settings
    const { error: gfError } = await supabase
      .from("game_fields")
      .update({
        internal_name: internalName,
        manual_fill,
        has_icon,
        has_color
      })
      .eq("id", gameFieldId);

    if (gfError) {
      console.error("Error updating game field:", gfError);
      return { error: `Failed to update game field: ${gfError.message}` };
    }
  } else {
    // Check if a game field with this internal name already exists for this game
    const { data: existingGf } = await supabase
      .from("game_fields")
      .select("id")
      .eq("game_id", game.id)
      .eq("internal_name", internalName)
      .single();

    if (existingGf) {
      gameFieldId = existingGf.id;
    } else {
      // Create new game field
      const { data: newGf, error: gfError } = await supabase
        .from("game_fields")
        .insert({
          game_id: game.id,
          internal_name: internalName,
          manual_fill,
          has_icon,
          has_color
        })
        .select("id")
        .single();

      if (gfError) {
        console.error("Error creating game field:", gfError);
        return { error: `Failed to create game field: ${gfError.message}` };
      }
      gameFieldId = newGf.id;
    }
  }

  // 2. Handle Section Field (The Link/Config)
  const sectionFieldData = {
    section_id: sectionId,
    game_field_id: gameFieldId,
    key: rawKey,
    category,
    required,
    is_multi,
    order_index,
  };

  if (fieldId) {
    // Update existing section field
    const { error: sfError } = await supabase
      .from("section_fields")
      .update(sectionFieldData)
      .eq("id", fieldId);

    if (sfError) {
      console.error("Error updating section field:", sfError);
      return { error: `Failed to update section field: ${sfError.message}` };
    }
  } else {
    // Create new section field
    const { error: sfError } = await supabase
      .from("section_fields")
      .insert(sectionFieldData);

    if (sfError) {
      console.error("Error creating section field:", sfError);
      return { error: `Failed to create section field: ${sfError.message}` };
    }
  }

  revalidatePath(`/admin/games/${gameSlug}`, 'layout');
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
}

/**
 * Deletes a field.
 * Database CASCADE handles field options and entity field values.
 */
export async function deleteFieldAction(
  fieldId: string,
  gameSlug: string,
  sectionId: string
) {
  const supabase = await createClient();

  // 1. Delete the field itself - CASCADE handles associated options and entity values
  const { error: fieldError } = await supabase
    .from("section_fields")
    .delete()
    .eq("id", fieldId);

  if (fieldError) {
    console.error("Error deleting field:", fieldError);
    throw new Error(`Failed to delete field: ${fieldError.message}`);
  }

  revalidatePath(`/admin/games/${gameSlug}`, 'layout');
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
}
