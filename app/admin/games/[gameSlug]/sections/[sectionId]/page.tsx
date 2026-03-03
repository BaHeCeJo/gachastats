import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  getGameBySlug, 
  getSectionById, 
  getSectionFields, 
  getSectionDisplaySettings, 
  getSectionEntities,
  Game,
  Section,
  SectionField,
  SectionEntity,
  SectionDisplaySettings,
  LocalizedString,
} from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getTranslatedField } from "@/lib/localization-utils";
import EditSectionClient from './EditSectionClient';
import { ProcessedEntity } from '@/app/[gameSlug]/sections/[sectionId]/page';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string }>; };

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  
  const [gameRes, sectionRes] = await Promise.all([
    getGameBySlug(gameSlug),
    getSectionById(sectionId)
  ]);

  const game = gameRes.data as Game | null;
  const section = sectionRes.data as Section | null;

  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';

  return { title: `Edit ${sectionName} in ${gameName} - Admin` };
}

async function updateDisplaySettingsAction(_gameSlug: string, sectionId: string, formData: FormData) {
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
  revalidatePath(`/admin/games/${_gameSlug}/sections/${sectionId}`);
  revalidatePath(`/[gameSlug]/sections/[sectionId]`, "page");
  
  return { error: undefined };
}

export default async function EditSectionPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const supabase = await createServerClient();

  // 1. Fetch basic game details (cached)
  const { data: gameRaw, error: gameError } = await getGameBySlug(gameSlug);
  const game = gameRaw as Game | null;
  if (!game || gameError) redirect("/admin/games");

  // 2. Parallelize ALL other queries
  const [
    sectionRes,
    teamsRes,
    fieldsRes,
    displaySettingsRes,
    entitiesRes,
    headersList,
    cookieStore
  ] = await Promise.all([
    getSectionById(sectionId),
    supabase.from("section_teams").select(`*, section_team_members(*)`).eq("section_id", sectionId).order('created_at', { ascending: false }),
    getSectionFields(sectionId),
    getSectionDisplaySettings(sectionId),
    getSectionEntities(sectionId, game.default_lang),
    headers(),
    cookies()
  ]);

  const section = sectionRes.data as Section | null;
  const sectionTeams = teamsRes.data || [];
  const fieldsRaw = fieldsRes.data as unknown as SectionField[];
  const displaySettings = displaySettingsRes.data as SectionDisplaySettings | null;
  const entities = entitiesRes.data as unknown as SectionEntity[];

  if (!section || section.game_id !== game.id) redirect(`/admin/games/${gameSlug}/sections`);

  // Process fields
  const fields = (fieldsRaw || []).map((f) => {
    return {
      id: f.id,
      section_id: sectionId,
      key: f.key,
      required: f.required,
      manual_fill: f.game_fields?.manual_fill || false,
      has_icon: f.game_fields?.has_icon || false,
      has_color: f.game_fields?.has_color || false,
      order_index: f.order_index,
      is_multi: f.is_multi,
      category: f.category,
      field_options: f.game_fields?.field_options || []
    };
  });

  const userLang = (await cookieStore).get('user_lang')?.value;
  const acceptLanguage = (await headersList).get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  const currentLang = userLang || browserLang;
  
  const gameFieldsMap = new Map((fieldsRaw || [])?.map((f) => [f.game_field_id, f]));

  const processedEntities: ProcessedEntity[] = (entities || []).map((entity) => {
    const defaultSkin = entity.entity_skins?.[0];
    const skinIconPath = defaultSkin?.entity_images?.find((img) => img.type === 'icon')?.image_path;
    const iconPath = entity.icon_path || skinIconPath;
    
    const publicIconUrl = iconPath ? getPublicUrl('games', iconPath) || "" : "";

    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};
    
    entity.entity_field_values?.forEach((val) => {
      const field = gameFieldsMap.get(val.game_field_id);
      if (!field) return;
      const fieldId = field.id;

      if (!allValues[fieldId]) allValues[fieldId] = [];
      
      if (val.option_id) {
        allValues[fieldId].push(String(val.option_id));
      } else {
        const valText = val.value_text as string | LocalizedString | null;
        const translatedValue = typeof valText === 'string' ? valText : getTranslatedField(valText || {}, currentLang, game.default_lang);
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
          iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined
        }; 
      } 
    });
    return { 
      id: entity.id,
      section_id: entity.section_id,
      name: entity.name,
      icon_path: entity.icon_path,
      publicIconUrl, 
      fieldValuesMap, 
      allValues 
    };
  });

  const filterFieldIds = displaySettings?.filter_field_ids || [];

  const filterFieldsData = (fields || [])
    .filter((f) => filterFieldIds.includes(f.id))
    .map((f) => ({ 
      id: String(f.id), 
      key: f.key, 
      options: (f.field_options || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((opt) => ({ 
          id: String(opt.id), 
          value_key: opt.value_key, 
          iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined, 
          color: opt.color 
        })) 
    })) || [];

  return <EditSectionClient game={game} section={section} fields={fields} displaySettings={displaySettings} entities={processedEntities} filterFieldsData={filterFieldsData} currentLang={currentLang} updateDisplaySettingsAction={updateDisplaySettingsAction.bind(null, gameSlug, sectionId)} sectionTeams={sectionTeams} />;
}
