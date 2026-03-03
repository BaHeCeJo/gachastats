import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  getGameBySlug, 
  getSectionById, 
  getFullEntityById, 
  getSectionFields, 
  getEntityFieldValues,
  getEntityTeams,
  getSectionEntities,
  Game,
  Section,
  SectionField,
  EntityFieldValue,
  SectionEntity,
  EntityImage,
} from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { getTranslatedField } from "@/lib/localization-utils";
import EditEntityClient from './EditEntityClient';
import { TeamData, TeamEntity } from '@/app/components/TeamBuilder';

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

  const game = gameRes.data as Game | null;
  const section = sectionRes.data as Section | null;
  const entity = entityRes.data as SectionEntity | null;

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

  const game = gameRes.data as Game | null;
  const section = sectionRes.data as Section | null;
  const entity = entityRes.data as SectionEntity | null;
  const fieldsRaw = fieldsRes.data as unknown as SectionField[];
  const entityValues = valuesRes.data as unknown as EntityFieldValue[];

  if (!game) redirect("/admin/games");
  if (!entity) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  // 2. Parallelize conditional/feature data
  const [teamsRes, sectionEntitiesRes] = await Promise.all([
    getEntityTeams(entityId),
    section.has_teams ? getSectionEntities(sectionId, game.default_lang) : Promise.resolve({ data: [] }),
  ]);

  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  // --- Process Skin Images ---
  if (entity.entity_skins) {
    for (const skin of entity.entity_skins) {
      for (const image of skin.entity_images) {
        if (image.image_path) {
          (image as EntityImage & { publicUrl?: string }).publicUrl = getPublicUrl('games', image.image_path);
        }
      }
    }
  }

  // --- Process Teams/Entities for Client ---
  let processedSectionEntities: TeamEntity[] = [];
  if (section.has_teams) {
    processedSectionEntities = (sectionEntitiesRes.data || []).map((ent: SectionEntity) => {
      const dSkin = ent.entity_skins?.find((s) => s.is_default) || ent.entity_skins?.[0];
      const iImg = dSkin?.entity_images?.find((img) => img.type === 'icon');
      return { id: ent.id, name: ent.name, icon_path: iImg?.image_path || ent.icon_path };
    });
  }

  // Process fields structure
  const fields = (fieldsRaw || []).map((f) => {
    return { 
      id: f.id,
      game_field_id: f.game_field_id,
      key: f.key,
      required: f.required,
      manual_fill: f.game_fields?.manual_fill || false,
      is_multi: f.is_multi,
      has_icon: f.game_fields?.has_icon || false,
      has_color: f.game_fields?.has_color || false,
      order_index: f.order_index,
      category: f.category,
      field_options: f.game_fields?.field_options || [] 
    };
  });

  const relevantTeams = (teamsRes.data || []) as TeamData[];

  return (
    <EditEntityClient 
      game={game} 
      section={section} 
      entity={{ ...entity, entity_field_values: entityValues || [] }} 
      fields={fields} 
      currentLang={currentLang}
      hasTeams={section.has_teams}
      maxTeamSize={section.max_team_size}
      sectionTeams={relevantTeams}
      sectionEntities={processedSectionEntities}
    />
  );
}
