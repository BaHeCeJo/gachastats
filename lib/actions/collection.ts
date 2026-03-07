"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleCollectionEntityAction(entityId: string, isOwned: boolean) {
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

  await Promise.all([
    revalidatePath(`/[gameSlug]/sections/[sectionId]`, "page"),
    revalidatePath("/profile")
  ]);
  return { success: true };
}

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

export async function toggleUserGameAction(gameId: string, isPlaying: boolean) {
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

  if (avatarFile && avatarFile.size > 0) {
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
      nickname, 
      avatar_url 
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
