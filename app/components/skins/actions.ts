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

  // Delete existing image of the same type for this skin
  const { data: existingImage } = await supabase
    .from("entity_images")
    .select("image_path")
    .eq("skin_id", skinId)
    .eq("type", imageType)
    .single();

  if (existingImage) {
    const path = existingImage.image_path.substring(
      existingImage.image_path.lastIndexOf(`/${entityId}/`)
    );
    await supabase.storage.from("games").remove([path]);
    await supabase.from("entity_images").delete().eq("image_path", existingImage.image_path);
  }

  const filePath = `${entityId}/${skinId}/${imageType}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("games")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload Error:", uploadError);
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("games").getPublicUrl(filePath);

  const { error: dbError } = await supabase.from("entity_images").insert({
    entity_id: entityId,
    skin_id: skinId,
    image_path: publicUrl,
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
    const paths = images.map((img) =>
      img.image_path.substring(img.image_path.lastIndexOf(`/${entityId}/`))
    );
    await supabase.storage.from("games").remove(paths);
  }

  await supabase.from("entity_images").delete().eq("skin_id", skinId);
  await supabase.from("entity_skins").delete().eq("id", skinId);

  revalidatePath(
    `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entityId}`
  );
}
