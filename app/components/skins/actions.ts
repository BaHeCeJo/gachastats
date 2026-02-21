"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadImage(
  formData: FormData,
  entityId: string,
  skinId: string,
  gameSlug: string,
  sectionId: string
) {
  const supabase = await createClient();
  const file = formData.get("image") as File;
  const imageType = formData.get("imageType") as string;

  if (!file || file.size === 0) {
    return { error: "No file provided" };
  }
  if (!imageType) {
    return { error: "Image type is missing" };
  }

  // 1. Delete existing image record of the same type for this skin
  const { data: existingImage } = await supabase
    .from("entity_images")
    .select("id, image_path")
    .eq("skin_id", skinId)
    .eq("type", imageType)
    .single();

  if (existingImage) {
    // Determine the actual storage path
    let storagePath = existingImage.image_path;
    if (storagePath.startsWith('http')) {
      // Legacy full URL cleanup attempt (fragile, but better than nothing)
      const parts = storagePath.split('/games/');
      if (parts.length > 1) {
        storagePath = parts[1];
      }
    }
    
    // Remove from storage and database
    await supabase.storage.from("games").remove([storagePath]);
    await supabase.from("entity_images").delete().eq("id", existingImage.id);
  }

  // 2. Upload new image with unique timestamped path
  const filePath = `entities/${entityId}/skins/${skinId}/${imageType}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const { error: uploadError } = await supabase.storage
    .from("games")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload Error:", uploadError);
    return { error: uploadError.message };
  }

  // 3. Save relative path in DB
  const { error: dbError } = await supabase.from("entity_images").insert({
    entity_id: entityId,
    skin_id: skinId,
    image_path: filePath, // Storing relative path
    type: imageType,
  });

  if (dbError) {
    console.error("Database Error:", dbError);
    await supabase.storage.from("games").remove([filePath]);
    return { error: dbError.message };
  }

  revalidatePath(
    `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`
  );

  return { error: null };
}

export async function deleteSkin(
  skinId: string,
  entityId: string,
  gameSlug: string,
  sectionId: string
) {
  const supabase = await createClient();

  const { data: images, error: imagesError } = await supabase
    .from("entity_images")
    .select("image_path")
    .eq("skin_id", skinId);

  if (images && images.length > 0) {
    const paths = images.map((img) => {
        if (img.image_path.startsWith('http')) {
            const parts = img.image_path.split('/games/');
            return parts.length > 1 ? parts[1] : img.image_path;
        }
        return img.image_path;
    });
    await supabase.storage.from("games").remove(paths);
  }

  await supabase.from("entity_images").delete().eq("skin_id", skinId);
  await supabase.from("entity_skins").delete().eq("id", skinId);

  revalidatePath(
    `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`
  );
}
