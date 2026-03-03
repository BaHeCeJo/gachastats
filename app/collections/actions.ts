"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Checks if the current user owns a specific entity.
 */
export async function checkEntityOwnershipAction(entityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { owned: false };

  const { data } = await supabase
    .from("user_entities")
    .select("id")
    .eq("user_id", user.id)
    .eq("entity_id", entityId)
    .maybeSingle();

  return { owned: !!data, authenticated: true };
}

/**
 * Toggles an entity in the user's collection.
 */
export async function toggleCollectionEntityAction(entityId: string, isOwned: boolean) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  if (isOwned) {
    // For now, removing still deletes all instances or the specific one. 
    // Usually, in a toggle UI, we delete the unique instance.
    const { error } = await supabase
      .from("user_entities")
      .delete()
      .eq("user_id", user.id)
      .eq("entity_id", entityId);
      
    if (error) return { error: error.message };
  } else {
    // Add to collection using the smart RPC function
    const { error } = await supabase
      .rpc("add_entity_to_user", { 
        p_user_id: user.id, 
        p_entity_id: entityId 
      });
      
    if (error) return { error: error.message };
  }

  // Revalidate only the necessary paths instead of the entire layout
  await Promise.all([
    revalidatePath(`/[gameSlug]/sections/[sectionId]`, "page"),
    revalidatePath("/profile")
  ]);
  return { success: true };
}

/**
 * Updates the dupes count for a specific user_entity instance.
 */
export async function updateEntityDupesAction(instanceId: string, dupes: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const { error } = await supabase
    .from("user_entities")
    .update({ dupes })
    .eq("id", instanceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Removes a specific user_entity instance.
 */
export async function removeUserEntityAction(instanceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const { error } = await supabase
    .from("user_entities")
    .delete()
    .eq("id", instanceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Toggles a game in the user's "Played Games" list.
 */
export async function toggleUserGameAction(gameId: string, isPlaying: boolean) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  if (isPlaying) {
    // Remove (Stop playing)
    const { error } = await supabase
      .from("user_games")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", gameId);
      
    if (error) return { error: error.message };
  } else {
    // Add (Start playing)
    const { error } = await supabase
      .from("user_games")
      .insert({ user_id: user.id, game_id: gameId });
      
    if (error) return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true };
}

/**
 * Updates user profile information, including avatar upload to the 'users' bucket.
 */
export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };

  const nickname = formData.get("nickname") as string;
  const avatarFile = formData.get("avatar_file") as File | null;
  let avatar_url = formData.get("existing_avatar_url") as string || null;

  // Handle Avatar Upload
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Upload/Overwrite the avatar in the 'users' bucket
    const { error: uploadError } = await supabase.storage
      .from('users')
      .upload(filePath, avatarFile, {
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage.from('users').getPublicUrl(filePath);
    avatar_url = publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ 
      nickname, 
      avatar_url 
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
