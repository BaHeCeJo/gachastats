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
async function uploadFileToStorage(file: File, bucket: string, folder: string): Promise<string> {
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
  const isDefault = formData.get("is_default") === "true"; // Assuming "true" or "false" string from form

  if (!rawName[gameDefaultLang]) {
    return { error: `Name for default language (${gameDefaultLang.toUpperCase()}) is required.` };
  }

  const skinData = {
    entity_id: entityId,
    name: rawName,
    is_default: isDefault,
  };

  if (skinId) {
    // Update existing skin
    const { error } = await supabase
      .from("entity_skins")
      .update(skinData)
      .eq("id", skinId);

    if (error) {
      console.error("Error updating skin:", error);
      return { error: `Failed to update skin: ${error.message}` };
    }
  } else {
    // Create new skin
    const { error } = await supabase
      .from("entity_skins")
      .insert(skinData);

    if (error) {
      console.error("Error creating skin:", error);
      return { error: `Failed to create skin: ${error.message}` };
    }
  }

  // If this skin is set as default, ensure all other skins for this entity are not default
  if (isDefault) {
    await supabase
      .from("entity_skins")
      .update({ is_default: false })
      .eq("entity_id", entityId)
      .neq("id", skinId || null); // Exclude the current skin if it's an update
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
  // No redirect, stay on entity page
  return { error: undefined };
}

/**
 * Upserts (creates or updates) a skin image (icon or splashart).
 */
export async function upsertSkinImage(
  gameSlug: string,
  sectionId: string,
  entityId: string,
  skinId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const imageType = formData.get("imageType") as string; // 'icon' or 'splashart'
  const imageFile = formData.get("image_file") as File;
  const existingImagePath = formData.get("existing_image_path") as string | null;

  if (!imageFile || imageFile.size === 0) {
    return { error: "No image file provided." };
  }
  if (!imageType) {
    return { error: "Image type (icon or splashart) is required." };
  }

  let imageUrl: string | null = null;
  let oldImagePath: string | null = existingImagePath;

  // Upload new image
  try {
    const folder = `${gameSlug}/sections/${sectionId}/entities/${entityId}/skins/${skinId}`;
    imageUrl = await uploadFileToStorage(imageFile, "games", folder);
  } catch (uploadError: any) {
    return { error: `Image upload failed: ${uploadError.message}` };
  }

  // Find if an image of this type already exists for this skin
  const { data: existingImage, error: fetchError } = await supabase
    .from("entity_images")
    .select("id, image_path")
    .eq("skin_id", skinId)
    .eq("type", imageType)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
    console.error("Error fetching existing skin image:", fetchError);
    return { error: `Failed to check for existing image: ${fetchError.message}` };
  }

  if (existingImage) {
    // Update existing image
    const { error: updateError } = await supabase
      .from("entity_images")
      .update({ image_path: imageUrl })
      .eq("id", existingImage.id);

    if (updateError) {
      console.error("Error updating skin image:", updateError);
      return { error: `Failed to update image path: ${updateError.message}` };
    }
    // Delete old image from storage if path changed
    if (existingImage.image_path && existingImage.image_path !== imageUrl) {
        await supabase.storage.from("games").remove([existingImage.image_path]);
    }
  } else {
    // Insert new image
    const { error: insertError } = await supabase
      .from("entity_images")
      .insert({
        entity_id: entityId,
        skin_id: skinId,
        type: imageType,
        image_path: imageUrl,
      });

    if (insertError) {
      console.error("Error inserting skin image:", insertError);
      return { error: `Failed to insert image: ${insertError.message}` };
    }
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
  return { error: undefined };
}


/**
 * Deletes a skin and its associated images.
 */
export async function deleteSkin(
  skinId: string,
  entityId: string,
  gameSlug: string,
  sectionId: string
) {
  const supabase = await createClient();

  // 1. Fetch all image paths for this skin
  const { data: images } = await supabase
    .from("entity_images")
    .select("image_path")
    .eq("skin_id", skinId);

  if (images && images.length > 0) {
    const paths = images
      .map((img) => img.image_path) // image_path is already a storage path here
      .filter(Boolean);

    if (paths.length > 0) {
      await supabase.storage.from("games").remove(paths);
    }
  }

  // 2. Delete associated images from the database
  await supabase
    .from("entity_images")
    .delete()
    .eq("skin_id", skinId);

  // 3. Delete the skin itself
  const { error } = await supabase
    .from("entity_skins")
    .delete()
    .eq("id", skinId);

  if (error) {
    console.error("Error deleting skin:", error);
    throw new Error(`Failed to delete skin: ${error.message}`);
  }

  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`);
  // No redirect, stay on entity page
}