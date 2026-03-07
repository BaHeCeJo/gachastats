"use server";

import { createPublicClient, createClient } from '@/lib/supabase/server';

export async function checkEntityOwnership(entityId: string) {
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

export async function getUserEntities(userId: string) {
  const supabase = createPublicClient();
  return supabase
    .from("user_entities")
    .select("*")
    .eq("user_id", userId);
}

export async function getUserGames(userId: string) {
  const supabase = createPublicClient();
  return supabase
    .from("user_games")
    .select("game_id")
    .eq("user_id", userId);
}
