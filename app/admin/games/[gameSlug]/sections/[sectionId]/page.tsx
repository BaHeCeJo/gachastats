import { createClient as createServerClient } from '@/lib/supabase/server';
import { getGameBySlug, getSectionById, getPublicUrl, getSectionFields, getSectionDisplaySettings, getSectionEntities } from "@/lib/supabase/queries";
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getTranslatedField, LocalizedString } from "@/lib/localization-utils";
import EditSectionClient from './EditSectionClient';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string }>; };

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const [gameRes, sectionRes] = await Promise.all([
    getGameBySlug(gameSlug),
    getSectionById(sectionId)
  ]);
  const game = gameRes.data;
  const section = sectionRes.data;
  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  return { title: `Edit ${sectionName} in ${gameName} - Admin` };
}

async function updateDisplaySettingsAction(gameSlug: string, sectionId: string, formData: FormData) {
  'use server'
  const supabase = await createServerClient()
  const max_columns = Number(formData.get('max_columns') || 6)
  const bg_color_field_id = (formData.get('bg_color_field_id') as string) || null
  const top_left_icon_field_id = (formData.get('top_left_icon_field_id') as string) || null
  const top_right_icon_field_id = (formData.get('top_right_icon_field_id') as string) || null
  const overlay_icon_field_id = (formData.get('overlay_icon_field_id') as string) || null
  const filter_field_ids = formData.getAll('filter_field_ids') as string[]

  const { error } = await supabase.from('section_display_settings').upsert({
    section_id: sectionId, max_columns, bg_color_field_id, top_left_icon_field_id, top_right_icon_field_id, overlay_icon_field_id, filter_field_ids
  }, { onConflict: 'section_id' })

  if (error) { console.error("Error updating display settings:", error); return { error: error.message }; }
  
  // Revalidate both admin and public views
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}`);
  revalidatePath(`/[gameSlug]/sections/[sectionId]`, "page");
  
  return { error: undefined };
}

export default async function EditSectionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createServerClient();

  // 1. Fetch basic game details (cached)
  const { data: game, error: gameError } = await getGameBySlug(gameSlug);
  if (!game || gameError) redirect("/admin/games");

  // 2. Parallelize ALL other queries
  const [
    sectionRes,
    teamsRes,
    fieldsRes,
    allGameFieldsRes,
    displaySettingsRes,
    entitiesRes,
    headersList,
    cookieStore
  ] = await Promise.all([
    getSectionById(sectionId),
    supabase.from("section_teams").select(`*, section_team_members(*)`).eq("section_id", sectionId).order('created_at', { ascending: false }),
    getSectionFields(sectionId),
    supabase.from('game_fields').select('*, field_options(id, value_key)').eq("game_id", game.id).order('internal_name', { ascending: true }),
    getSectionDisplaySettings(sectionId),
    getSectionEntities(sectionId, game.default_lang),
    headers(),
    cookies()
  ]);

  const section = sectionRes.data;
  const sectionTeams = teamsRes.data || [];
  const fieldsRaw = fieldsRes.data;
  const allGameFields = allGameFieldsRes.data;
  const displaySettings = displaySettingsRes.data;
  const entities = entitiesRes.data;

  if (!section || section.game_id !== game.id) redirect(`/admin/games/${gameSlug}/sections`);

  // Process fields
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

  const userLang = cookieStore.get('user_lang')?.value;
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  const currentLang = userLang || browserLang;
  
  const gameFieldsMap = new Map((fields || [])?.map(f => [f.game_field_id, f]));

  const processedEntities = (entities || []).map((entity: any) => {
    const defaultSkin = entity.entity_skins?.[0];
    const skinIconPath = defaultSkin?.entity_images?.find((img: any) => img.type === 'icon')?.image_path;
    const iconPath = entity.icon_path || skinIconPath;
    
    const publicIconUrl = getPublicUrl('games', iconPath) || "";

    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};
    
    entity.entity_field_values?.forEach((val: any) => {
      const field = gameFieldsMap.get(val.game_field_id);
      if (!field) return;
      const fieldId = field.id;

      if (!allValues[fieldId]) allValues[fieldId] = [];
      
      if (val.option_id) {
        allValues[fieldId].push(String(val.option_id));
      } else {
        const translatedValue = getTranslatedField(val.value_text, currentLang, game.default_lang);
        if (translatedValue) {
          if (field?.is_multi) {
            const parts = translatedValue.split(',').filter(Boolean).map((p: string) => p.trim());
            allValues[fieldId].push(...parts);
          } else {
            allValues[fieldId].push(translatedValue);
          }
        }
      }

      const opt = val.field_options; 
      if (opt) { 
        fieldValuesMap[fieldId] = { 
          color: opt.color || undefined, 
          iconUrl: getPublicUrl('games', opt.icon_path) || undefined 
        }; 
      } 
    });
    return { ...entity, publicIconUrl, fieldValuesMap, allValues };
  });

  const filterFieldIds = (displaySettings as any)?.filter_field_ids || [];

  const filterFieldsData = (fields || [])
    .filter((f) => filterFieldIds.includes(f.id))
    .map((f) => ({ 
      id: String(f.id), 
      key: f.key, 
      options: (f.field_options || [] as any)
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((opt: any) => ({ 
          id: String(opt.id), 
          value_key: opt.value_key, 
          iconUrl: getPublicUrl('games', opt.icon_path) || undefined, 
          color: opt.color 
        })) 
    })) || [];

  return <EditSectionClient game={game as any} section={section as any} fields={fields as any} gameFields={allGameFields || []} displaySettings={displaySettings as any} entities={processedEntities} filterFieldsData={filterFieldsData} currentLang={currentLang} updateDisplaySettingsAction={updateDisplaySettingsAction} sectionTeams={sectionTeams} />;
}
