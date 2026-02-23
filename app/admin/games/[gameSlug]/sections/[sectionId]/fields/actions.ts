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
  const field_type = formData.get("field_type") as string;
  const required = formData.get("required") === 'on';
  const manual_fill = formData.get("manual_fill") === 'on';
  const has_icon = formData.get("has_icon") === 'on';
  const has_color = formData.get("has_color") === 'on';
  const is_multi = formData.get("is_multi") === 'on';
  const order_index = Number(formData.get("order_index") || 0);

  if (!rawKey[gameDefaultLang]) {
    return { error: `Key for default language (${gameDefaultLang.toUpperCase()}) is required.` };
  }
  if (!field_type) {
    return { error: "Field type is required." };
  }

  const fieldData = {
    section_id: sectionId,
    key: rawKey,
    category,
    field_type,
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
 * Deletes a field and all its associated options and entity field values.
 */
export async function deleteFieldAction(
  fieldId: string,
  gameSlug: string,
  sectionId: string
) {
  const supabase = await createClient();

  // 1. Delete associated field options
  const { error: optionsError } = await supabase
    .from("field_options")
    .delete()
    .eq("field_id", fieldId);

  if (optionsError) {
    console.error("Error deleting field options:", optionsError);
    throw new Error(`Failed to delete field options: ${optionsError.message}`);
  }

  // 2. Delete associated entity field values
  const { error: valuesError } = await supabase
    .from("entity_field_values")
    .delete()
    .eq("field_id", fieldId);

  if (valuesError) {
    console.error("Error deleting entity field values:", valuesError);
    throw new Error(`Failed to delete entity field values: ${valuesError.message}`);
  }

  // 3. Delete the field itself
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
