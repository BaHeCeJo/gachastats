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

  const fieldId = formData.get("id") as string | undefined;
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

  const fieldData = {
    section_id: sectionId,
    key: rawKey,
    category,
    required,
    manual_fill,
    has_icon,
    has_color,
    is_multi,
    order_index,
  };

  if (fieldId) {
    // Update existing field
    const { error } = await supabase
      .from("section_fields")
      .update(fieldData)
      .eq("id", fieldId);

    if (error) {
      console.error("Error updating field:", error);
      return { error: `Failed to update field: ${error.message}` };
    }
  } else {
    // Create new field
    const { error } = await supabase
      .from("section_fields")
      .insert(fieldData);

    if (error) {
      console.error("Error creating field:", error);
      return { error: `Failed to create field: ${error.message}` };
    }
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
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

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
}
