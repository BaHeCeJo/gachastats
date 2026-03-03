"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === 'admin';
}

interface TeamMemberInsert {
  team_id: string;
  member_type: 'entity' | 'option';
  entity_id: string | null;
  option_id: string | null;
  slot_index: number;
  order_index: number;
}

export async function upsertTeamAction(
  sectionId: string,
  teamId: string | null,
  name: string,
  slots: { members: { type: 'entity' | 'option'; id: string }[] }[]
) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const supabase = await createClient();

  const teamData = {
    section_id: sectionId,
    name: name ? { en: name } : null,
  };

  let actualTeamId = teamId;

  if (teamId) {
    const { error } = await supabase
      .from("section_teams")
      .update(teamData)
      .eq("id", teamId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("section_teams")
      .insert(teamData)
      .select("id")
      .single();
    if (error) return { error: error.message };
    actualTeamId = data.id;
  }

  // 1. Delete existing members first to avoid conflicts during re-insertion
  const { error: deleteError } = await supabase
    .from("section_team_members")
    .delete()
    .eq("team_id", actualTeamId);
    
  if (deleteError) return { error: deleteError.message };

  // 2. Prepare member data with both slot_index AND order_index
  const memberData: TeamMemberInsert[] = [];
  slots.forEach((slot, slotIndex) => {
    slot.members.forEach((member, priority) => {
      memberData.push({
        team_id: actualTeamId!,
        member_type: member.type,
        entity_id: member.type === 'entity' ? member.id : null,
        option_id: member.type === 'option' ? member.id : null,
        slot_index: slotIndex,
        order_index: priority, // This differentiates alternatives within the same slot
      });
    });
  });

  if (memberData.length > 0) {
    const { error: membersError } = await supabase
      .from("section_team_members")
      .insert(memberData);
    if (membersError) return { error: membersError.message };
  }

  revalidatePath(`/`);
  return { success: true, teamId: actualTeamId };
}

export async function deleteTeamAction(teamId: string) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  const supabase = await createClient();
  const { error } = await supabase.from("section_teams").delete().eq("id", teamId);
  if (error) return { error: error.message };
  revalidatePath(`/`);
  return { success: true };
}
