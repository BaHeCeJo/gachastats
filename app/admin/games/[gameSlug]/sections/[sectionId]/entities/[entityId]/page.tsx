import { 
  getGameBySlug, 
  getSectionById, 
  getFullEntityById, 
  getSectionFields, 
  getEntityTeams,
  getSectionEntitiesLibrary,
  getSectionStats,
  getSectionAscensions,
  getEntityStats,
  getSectionAbilityTemplates,
  getEntityAbilities,
  Game,
  Section,
  SectionField,
  SectionEntity,
  EntityImage,
} from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { getTranslatedField } from "@/lib/localization-utils";
import EditEntityClient from './EditEntityClient';
import { TeamData } from '@/app/components/teambuilder/types';
import AdminHeader from '@/app/admin/components/AdminHeader';
import { Suspense } from 'react';

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

  // All queries run in a single parallel batch — entityId/sectionId come from params,
  // so no query depends on the result of another.
  const [
    gameRes, sectionRes, entityRes, fieldsRes, headersList,
    teamsRes, sectionStatsRes, sectionAscensionsRes, entityStatsRes, abilityTemplatesRes, entityAbilitiesRes
  ] = await Promise.all([
    getGameBySlug(gameSlug),
    getSectionById(sectionId),
    getFullEntityById(entityId),
    getSectionFields(sectionId),
    headers(),
    getEntityTeams(entityId),
    getSectionStats(sectionId),
    getSectionAscensions(sectionId),
    getEntityStats(entityId),
    getSectionAbilityTemplates(sectionId),
    getEntityAbilities(entityId),
  ]);

  const game = gameRes.data as Game | null;
  const section = sectionRes.data as Section | null;
  const entity = entityRes.data as SectionEntity | null;
  const fieldsRaw = fieldsRes.data as unknown as SectionField[];

  if (!game) redirect("/admin/games");
  if (!entity) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  // 3. DEFERRED DATA: Prepare the library promise BUT DO NOT AWAIT IT
  // This allows the server to start sending the HTML for the form immediately
  const libraryPromise = section.has_teams ? getSectionEntitiesLibrary(sectionId) : Promise.resolve({ data: [] });

  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  // --- Process Skin Images ---
  if (entity.entity_skins) {
    for (const skin of entity.entity_skins) {
      for (const image of skin.entity_images) {
        if (image.image_path) {
          (image as EntityImage & { publicUrl?: string }).publicUrl = getPublicUrl('games', image.image_path) || undefined;
        }
      }
    }
  }

  // --- Process Teams for Client ---
  const relevantTeams = (teamsRes.data || []) as TeamData[];

  // Process fields structure
  const fields = (fieldsRaw || []).map((f) => {
    const gf = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    return { 
      id: f.id,
      game_field_id: f.game_field_id,
      key: f.key,
      required: f.required,
      manual_fill: gf?.manual_fill || false,
      is_multi: f.is_multi,
      has_icon: gf?.has_icon || false,
      has_color: gf?.has_color || false,
      order_index: f.order_index,
      category: f.category,
      field_options: gf?.field_options || [] 
    };
  });

  return (
    <>
      <AdminHeader params={paramsPromise} />
      <Suspense fallback={<div className="p-8 max-w-4xl mx-auto space-y-6 animate-pulse"><div className="h-10 bg-zinc-800 rounded w-1/2"></div><div className="h-64 bg-zinc-800 rounded"></div><div className="h-96 bg-zinc-800 rounded"></div></div>}>
        <EditEntityClient 
          game={game} 
          section={section} 
          entity={entity} 
          fields={fields} 
          currentLang={currentLang}
          hasTeams={section.has_teams}
          maxTeamSize={section.max_team_size}
          sectionTeams={relevantTeams}
          libraryPromise={libraryPromise} 
          sectionStats={sectionStatsRes.data || []}
          sectionAscensions={sectionAscensionsRes.data || []}
          entityStats={entityStatsRes.data || []}
          abilityTemplates={abilityTemplatesRes.data || []}
          existingAbilities={entityAbilitiesRes.data || []}
        />
      </Suspense>
    </>
  );
}
