"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";

/**
 * Validates a UUID string format.
 */
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function toggleCollectionEntityAction(entityId: string, isOwned: boolean) {
  if (!isValidUUID(entityId)) return { error: "Invalid Entity ID format" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  if (isOwned) {
    const { error } = await supabase
      .from("user_entities")
      .delete()
      .eq("user_id", user.id)
      .eq("entity_id", entityId);
      
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .rpc("add_entity_to_user", { 
        p_user_id: user.id, 
        p_entity_id: entityId 
      });
      
    if (error) return { error: error.message };
  }

  updateTag(`collection-${user.id}`);
  
  await Promise.all([
    revalidatePath(`/[gameSlug]/sections/[sectionId]`, "page"),
    revalidatePath("/profile")
  ]);
  return { success: true };
}

export async function updateEntityDupesAction(instanceId: string, dupes: number) {
  if (!isValidUUID(instanceId)) return { error: "Invalid Instance ID format" };
  if (!Number.isInteger(dupes) || dupes < 0 || dupes > 1000) {
    return { error: "Invalid duplicate count" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const { error } = await supabase
    .from("user_entities")
    .update({ dupes })
    .eq("id", instanceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  
  updateTag(`collection-${user.id}`);
  revalidatePath("/profile");
  return { success: true };
}

export async function updateUserEntityStatsAction(instanceId: string, level: number, phase_index: number) {
  if (!isValidUUID(instanceId)) return { error: "Invalid Instance ID format" };
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const { error } = await supabase
    .from("user_entities")
    .update({ level, phase_index })
    .eq("id", instanceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  
  updateTag(`collection-${user.id}`);
  revalidatePath("/profile");
  return { success: true };
}

export async function removeUserEntityAction(instanceId: string) {
  if (!isValidUUID(instanceId)) return { error: "Invalid Instance ID format" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const { error } = await supabase
    .from("user_entities")
    .delete()
    .eq("id", instanceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  
  updateTag(`collection-${user.id}`);
  revalidatePath("/profile");
  return { success: true };
}

export async function toggleUserGameAction(gameId: string, isPlaying: boolean) {
  if (!isValidUUID(gameId)) return { error: "Invalid Game ID format" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  if (isPlaying) {
    const { error } = await supabase
      .from("user_games")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", gameId);
      
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("user_games")
      .insert({ user_id: user.id, game_id: gameId });
      
    if (error) return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true };
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const nickname = formData.get("nickname") as string;
  const avatarFile = formData.get("avatar_file") as File | null;
  let avatar_url = formData.get("existing_avatar_url") as string || null;

  // 1. Validate Nickname
  if (!nickname || nickname.trim().length === 0) {
    return { error: "Nickname cannot be empty" };
  }
  if (nickname.length > 50) {
    return { error: "Nickname must be 50 characters or less" };
  }

  // 2. Validate File (if present)
  if (avatarFile && avatarFile.size > 0) {
    // Max size: 2MB
    if (avatarFile.size > 2 * 1024 * 1024) {
      return { error: "Avatar image must be less than 2MB" };
    }
    // Allowed types
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(avatarFile.type)) {
      return { error: "Only JPG, PNG, WEBP, and GIF images are allowed" };
    }

    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('users')
      .upload(filePath, avatarFile, {
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

    const { data: { publicUrl } } = supabase.storage.from('users').getPublicUrl(filePath);
    avatar_url = publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ 
      nickname: nickname.trim(), // Sanitize: trim whitespace
      avatar_url 
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
