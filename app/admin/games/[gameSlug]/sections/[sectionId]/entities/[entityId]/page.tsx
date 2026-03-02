import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { LocalizedString, getTranslatedField } from "@/lib/localization-utils";
import EditEntityClient from './EditEntityClient';

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string; entityId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug, sectionId, entityId } = await params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('name').eq('slug', gameSlug).single();
  const { data: section } = await supabase.from('game_sections').select('key').eq('id', sectionId).single();
  const { data: entity } = await supabase.from('section_entities').select('name').eq('id', entityId).single();

  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  const entityName = entity?.name ? getTranslatedField(entity.name, 'en', 'en') : 'Entity';

  return { title: `Edit ${entityName} in ${sectionName} (${gameName}) - Admin` };
}

export default async function EntityPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId, entityId } = params;
  const supabase = await createServerClient();
  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  const { data: game } = await supabase.from('games').select('id, name, slug, default_lang, supported_languages').eq('slug', gameSlug).single();
  if (!game) redirect('/admin/games');

  const { data: section } = await supabase.from('game_sections').select('id, key, game_id, has_teams, max_team_size').eq('id', sectionId).single();
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  const { data: entity, error: entityError } = await supabase.from("section_entities").select(`
    id, section_id, name, icon_path,
    entity_skins (
      id, entity_id, name, is_default,
      entity_images ( id, type, key, image_path, width, height, order_index )
    )
  `).eq("id", entityId).single();

  if (entityError || !entity) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);

  // --- Process Skin Images ---
  for (const skin of entity.entity_skins) {
    for (const image of skin.entity_images) {
      if (image.image_path) {
        (image as any).publicUrl = image.image_path.startsWith("http") 
          ? image.image_path 
          : supabase.storage.from("games").getPublicUrl(image.image_path).data.publicUrl;
      }
    }
  }

  // --- Teams Feature Data Fetch ---
  let sectionEntities: any[] = [];
  let relevantTeams: any[] = [];

  if (section.has_teams) {
    const [entRes, teamIdsRes] = await Promise.all([
      supabase.from("section_entities").select(`id, name, icon_path, entity_skins (is_default, entity_images (image_path, type))`).eq("section_id", sectionId),
      supabase.from("section_team_members").select("team_id").eq("entity_id", entityId)
    ]);

    sectionEntities = (entRes.data || []).map((ent: any) => {
      const dSkin = ent.entity_skins?.find((s: any) => s.is_default) || ent.entity_skins?.[0];
      const iImg = dSkin?.entity_images?.find((img: any) => img.type === 'icon');
      return { ...ent, icon_path: iImg?.image_path || ent.icon_path };
    });

    const teamIds = (teamIdsRes.data || []).map(t => t.team_id);
    if (teamIds.length > 0) {
      const { data: teams } = await supabase.from("section_teams").select(`*, section_team_members(*)`).in("id", teamIds).order('created_at', { ascending: false });
      relevantTeams = teams || [];
    }
  }

  // Fetch all fields for this section
  const { data: fieldsRaw, error: fieldsError } = await supabase
    .from("section_fields")
    .select(`
      id, key, required, is_multi, category, order_index, game_field_id,
      game_fields (
        manual_fill, has_icon, has_color
      )
    `)
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true });

  const gameFieldIds = (fieldsRaw || []).map(f => f.game_field_id).filter(Boolean);
  const { data: allOptions } = gameFieldIds.length > 0
    ? await supabase.from('field_options').select('id, game_field_id, value_key, icon_path, color, order_index').in('game_field_id', gameFieldIds)
    : { data: [] };

  const fields = (fieldsRaw || []).map(f => {
    const gf = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    const options = (allOptions || []).filter((opt: any) => opt.game_field_id === f.game_field_id);
    return { ...f, manual_fill: gf?.manual_fill, has_icon: gf?.has_icon, has_color: gf?.has_color, field_options: options || [] };
  });

  const { data: entityFieldValuesData, error: valuesError } = await supabase.from('entity_field_values').select('game_field_id, value_text, option_id').eq('entity_id', entityId);

  return (
    <EditEntityClient 
      game={game} 
      section={section} 
      entity={{ ...entity, entity_field_values: entityFieldValuesData || [] } as any} 
      fields={(fields || []) as any} 
      currentLang={currentLang}
      hasTeams={section.has_teams}
      maxTeamSize={section.max_team_size}
      sectionTeams={relevantTeams}
      sectionEntities={sectionEntities}
    />
  );
}
