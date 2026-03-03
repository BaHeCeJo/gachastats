import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  getGameBySlug, 
  getSectionById, 
  getFullEntityById, 
  getSectionFields, 
  getEntityFieldValues,
  getEntityTeams,
  getSectionEntities,
  getFieldOptions,
  getPublicUrl 
} from "@/lib/supabase/queries";
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { LocalizedString, getTranslatedField } from "@/lib/localization-utils";
import EditEntityClient from './EditEntityClient';

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string; entityId: string }>;
};

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId, entityId } = await paramsPromise;
  
  const [gameRes, sectionRes, entityRes] = await Promise.all([
    getGameBySlug(gameSlug),
    getSectionById(sectionId),
    getFullEntityById(entityId)
  ]);

  const game = gameRes.data;
  const section = sectionRes.data;
  const entity = entityRes.data;

  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  const entityName = entity?.name ? getTranslatedField(entity.name, 'en', 'en') : 'Entity';

  return { title: `Edit ${entityName} in ${sectionName} (${gameName}) - Admin` };
}

export default async function EntityPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId, entityId } = params;
  const supabase = await createServerClient();

  // 1. Parallelize Auth and Basic Data (Game/Entity are cached)
  const [userRes, gameRes, sectionRes, entityRes, fieldsRes, valuesRes, headersList] = await Promise.all([
    supabase.auth.getUser(),
    getGameBySlug(gameSlug),
    getSectionById(sectionId),
    getFullEntityById(entityId),
    getSectionFields(sectionId),
    getEntityFieldValues(entityId),
    headers()
  ]);

  const user = userRes.data.user;
  if (!user) redirect("/auth/signin");

  const { data: game, error: gameError } = gameRes;
  const { data: section } = sectionRes;
  const { data: entity, error: entityError } = entityRes;
  const { data: fieldsRaw } = fieldsRes;
  const { data: entityValues } = valuesRes;

  if (gameError || !game) redirect("/admin/games");
  if (entityError || !entity) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  // 2. Parallelize conditional/feature data
  const [teamsRes, sectionEntitiesRes, fieldOptionsRes] = await Promise.all([
    getEntityTeams(entityId),
    section.has_teams ? getSectionEntities(sectionId, game.default_lang) : Promise.resolve({ data: [] }),
    section.has_teams ? getFieldOptions() : Promise.resolve({ data: [] })
  ]);

  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  // --- Process Skin Images ---
  if (entity.entity_skins) {
    for (const skin of entity.entity_skins) {
      for (const image of skin.entity_images) {
        if (image.image_path) {
          (image as any).publicUrl = getPublicUrl('games', image.image_path);
        }
      }
    }
  }

  // --- Process Teams/Entities for Client ---
  let processedSectionEntities: any[] = [];
  if (section.has_teams) {
    processedSectionEntities = (sectionEntitiesRes.data || []).map((ent: any) => {
      const dSkin = ent.entity_skins?.find((s: any) => s.is_default) || ent.entity_skins?.[0];
      const iImg = dSkin?.entity_images?.find((img: any) => img.type === 'icon');
      return { ...ent, icon_path: iImg?.image_path || ent.icon_path };
    });
  }

  // Process fields structure
  const fields = (fieldsRaw || []).map((f: any) => {
    const gf = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    return { 
      ...f, 
      manual_fill: gf?.manual_fill, 
      has_icon: gf?.has_icon, 
      has_color: gf?.has_color, 
      field_options: gf?.field_options || [] 
    };
  });

  const relevantTeams = teamsRes.data || [];

  return (
    <EditEntityClient 
      game={game as any} 
      section={section as any} 
      entity={{ ...entity, entity_field_values: entityValues || [] } as any} 
      fields={(fields || []) as any} 
      currentLang={currentLang}
      hasTeams={section.has_teams}
      maxTeamSize={section.max_team_size}
      sectionTeams={relevantTeams}
      sectionEntities={processedSectionEntities}
    />
  );
}
