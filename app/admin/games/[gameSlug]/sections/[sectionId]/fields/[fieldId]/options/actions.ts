"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LocalizedString } from "@/lib/localization";
import { v4 as uuidv4 } from "uuid";

/**
 * Extracts the storage path from a public URL.
 */
function extractPathFromUrl(url: string, bucket: string): string {
  if (!url) return "";
  if (!url.startsWith("http")) return url;
  
  const searchStr = `/${bucket}/`;
  if (!url.includes(searchStr)) return ""; 
  
  const parts = url.split(searchStr);
  return parts[parts.length - 1];
}

/**
 * Handles uploading an image file to Supabase storage.
 */
async function uploadImage(file: File, bucket: string, folder: string): Promise<string> {
  const supabase = await createClient();
  const fileExtension = file.name.split(".").pop();
  const path = `${folder}/${uuidv4()}.${fileExtension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Error uploading image:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return path;
}

/**
 * Upserts (creates or updates) an option entry.
 */
export async function upsertOptionAction(
  gameSlug: string,
  sectionId: string,
  fieldId: string,
  gameDefaultLang: string,
  formData: FormData
) {
  const supabase = await createClient();

  const optionId = formData.get("id") as string | undefined;
  const rawValueKey = JSON.parse(formData.get("value_key") as string) as LocalizedString;
  const color = (formData.get("color") as string);
  const order_index = Number(formData.get("order_index") || 0);
  const iconFile = formData.get("icon_file"); // File or null
  const existingIconPath = formData.get("existing_icon_path") as string | null;

  if (!rawValueKey[gameDefaultLang]) {
    return { error: `Value Key for default language (${gameDefaultLang.toUpperCase()}) is required.` };
  }

  let icon_path: string | null = null;
  let oldIconPath: string | null = existingIconPath; // Assume existing path by default

  if (optionId && !iconFile && !existingIconPath) {
    // If updating, no new file, and no existing path passed (meaning it was removed)
    // Fetch current icon_path to potentially delete
    const { data: currentOption, error: fetchError } = await supabase
      .from("field_options")
      .select("icon_path")
      .eq("id", optionId)
      .single();

    if (fetchError) {
      console.error("Error fetching current option for icon management:", fetchError);
      return { error: `Failed to fetch current option icon: ${fetchError.message}` };
    }
    if (currentOption?.icon_path) {
      oldIconPath = extractPathFromUrl(currentOption.icon_path, "games");
    }
  }

  // Handle icon file upload/deletion
  if (iconFile instanceof File && iconFile.size > 0) {
    // New file uploaded
    icon_path = await uploadImage(iconFile, "games", `${gameSlug}/sections/fields/${fieldId}/options`);
    // If there was an old icon, delete it
    if (oldIconPath && oldIconPath !== icon_path) {
      await supabase.storage.from("games").remove([oldIconPath]);
    }
  } else if (existingIconPath && existingIconPath !== "null") {
    // Existing image path was retained, no new upload
    icon_path = existingIconPath;
  } else {
    // Icon was removed or never existed
    icon_path = null;
    // If there was an old icon, delete it
    if (oldIconPath) {
      await supabase.storage.from("games").remove([oldIconPath]);
    }
  }

  const optionData = {
    field_id: fieldId,
    value_key: rawValueKey,
    color,
    order_index,
    icon_path: icon_path,
  };

  if (optionId) {
    // Update existing option
    const { error } = await supabase
      .from("field_options")
      .update(optionData)
      .eq("id", optionId);

    if (error) {
      console.error("Error updating option:", error);
      return { error: `Failed to update option: ${error.message}` };
    }
  } else {
    // Create new option
    const { error } = await supabase
      .from("field_options")
      .insert(optionData);

    if (error) {
      console.error("Error creating option:", error);
      return { error: `Failed to create option: ${error.message}` };
    }
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
}

/**
 * Deletes an option entry.
 */
export async function deleteOptionAction(
  optionId: string,
  gameSlug: string,
  sectionId: string,
  fieldId: string
) {
  const supabase = await createClient();

  // 1. Fetch icon path for storage cleanup
  const { data: option, error: fetchError } = await supabase
    .from("field_options")
    .select("icon_path")
    .eq("id", optionId)
    .single();

  if (fetchError) {
    console.error("Error fetching option for deletion:", fetchError);
    throw new Error(`Failed to fetch option: ${fetchError.message}`);
  }

  if (option?.icon_path) {
    const path = extractPathFromUrl(option.icon_path, "games");
    if (path) {
      await supabase.storage.from("games").remove([path]);
    }
  }

  // 2. Delete the option itself
  const { error } = await supabase
    .from("field_options")
    .delete()
    .eq("id", optionId);

  if (error) {
    console.error("Error deleting option:", error);
    throw new Error(`Failed to delete option: ${error.message}`);
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);
}