import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  getGameBySlug, 
  getSectionById, 
  getSectionFields, 
  getSectionDisplaySettings, 
  getSectionEntities,
  getSectionStats,
  getSectionAscensions,
  getSectionAbilityTemplates,
  Game,
  Section,
  SectionField,
  SectionEntity,
  SectionDisplaySettings,
} from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getTranslatedField } from "@/lib/localization-utils";
import EditSectionClient from './EditSectionClient';
import { ProcessedEntity } from '@/app/[gameSlug]/sections/[sectionId]/page';
import AdminHeader from '@/app/admin/components/AdminHeader';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string }>; };

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const [gameRes, sectionRes] = await Promise.all([getGameBySlug(gameSlug), getSectionById(sectionId)]);
  const game = gameRes.data as Game;
  const section = sectionRes.data as Section;
  const gName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  return { title: `Edit ${sName} in ${gName} - Admin` };
}

async function updateDisplaySettingsAction(_gameSlug: string, sectionId: string, formData: FormData) {
  'use server'
  const supabase = await createServerClient();
  const data = {
    section_id: sectionId,
    max_columns: Number(formData.get('max_columns') || 6),
    bg_color_field_id: (formData.get('bg_color_field_id') as string) || null,
    top_left_icon_field_id: (formData.get('top_left_icon_field_id') as string) || null,
    top_right_icon_field_id: (formData.get('top_right_icon_field_id') as string) || null,
    overlay_icon_field_id: (formData.get('overlay_icon_field_id') as string) || null,
    filter_field_ids: formData.getAll('filter_field_ids') as string[],
    skin_display_types: formData.getAll('skin_display_types') as string[]
  };
  const { error } = await supabase.from('section_display_settings').upsert(data, { onConflict: 'section_id' });
  if (error) return { error: error.message };
  revalidatePath(`/admin/games/${_gameSlug}/sections/${sectionId}`);
  revalidatePath(`/[gameSlug]/sections/[sectionId]`, "page");
  return { error: undefined };
}

/**
 * Processes a single entity for the admin view.
 */
function processAdminEntity(entity: SectionEntity, gameFieldsMap: Map<string, SectionField>, currentLang: string, defaultLang: string): ProcessedEntity {
  const defaultSkin = entity.entity_skins?.[0];
  const skinIcon = defaultSkin?.entity_images?.find((img) => img.type === 'icon')?.image_path;
  const iconPath = entity.icon_path || skinIcon || null;
  const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
  const allValues: Record<string, string[]> = {};
  
  entity.entity_field_values?.forEach((val) => {
    const field = gameFieldsMap.get(val.game_field_id);
    if (!field) return;
    const fId = field.id;
    // eslint-disable-next-line security/detect-object-injection
    if (!allValues[fId]) allValues[fId] = [];
    if (val.option_id) {
      // eslint-disable-next-line security/detect-object-injection
      allValues[fId].push(String(val.option_id));
    } else {
      const translated = typeof val.value_text === 'string' ? val.value_text : getTranslatedField(val.value_text || {}, currentLang, defaultLang);
      if (translated) {
        const parts = field.is_multi ? translated.split(',').filter(Boolean).map(p => p.trim()) : [translated];
        // eslint-disable-next-line security/detect-object-injection
        allValues[fId].push(...parts);
      }
    }
    const opt = Array.isArray(val.field_options) ? val.field_options[0] : val.field_options;
    if (opt) {
      // eslint-disable-next-line security/detect-object-injection
      fieldValuesMap[fId] = { color: opt.color || undefined, iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined };
    } 
  });
  return { id: entity.id, section_id: entity.section_id, name: entity.name, icon_path: iconPath, publicIconUrl: iconPath ? getPublicUrl('games', iconPath) || "" : "", fieldValuesMap, allValues };
}

export default async function EditSectionPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const supabase = await createServerClient();

  // Run game fetch in parallel with everything else — no sequential waterfall
  const [gameRes, sRes, fRes, dsRes, statsRes, ascRes, templatesRes, hRes, cStore] = await Promise.all([
    getGameBySlug(gameSlug),
    getSectionById(sectionId),
    getSectionFields(sectionId),
    getSectionDisplaySettings(sectionId),
    getSectionStats(sectionId),
    getSectionAscensions(sectionId),
    getSectionAbilityTemplates(sectionId),
    headers(),
    cookies(),
  ]);

  const game = gameRes.data as Game | null;
  if (!game) redirect("/admin/games");

  // These two need game.default_lang, so they start after game resolves — but that's already done above
  const [tRes, eRes] = await Promise.all([
    supabase.from("section_teams").select(`*, section_team_members(*)`).eq("section_id", sectionId).order('created_at', { ascending: false }),
    getSectionEntities(sectionId, game.default_lang),
  ]);

  const section = sRes.data as Section;
  if (!section || section.game_id !== game.id) redirect(`/admin/games/${gameSlug}/sections`);

  const fields = (fRes.data as unknown as SectionField[] || []).map(f => {
    const gField = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    return { 
      id: f.id, 
      section_id: sectionId, 
      key: f.key, 
      required: f.required, 
      manual_fill: gField?.manual_fill || false, 
      has_icon: gField?.has_icon || false, 
      has_color: gField?.has_color || false, 
      order_index: f.order_index, 
      is_multi: f.is_multi, 
      category: f.category, 
      field_options: gField?.field_options || [] 
    };
  });
  const lang = (await cStore).get('user_lang')?.value || (await hRes).get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';
  const gFieldsMap = new Map((fRes.data as unknown as SectionField[] || []).map(f => [f.game_field_id, f]));
  const processedEntities = (eRes.data as unknown as SectionEntity[] || []).map(e => processAdminEntity(e, gFieldsMap, lang, game.default_lang));

  const filterIds = (dsRes.data as SectionDisplaySettings)?.filter_field_ids || [];
  const filterData = fields.filter(f => filterIds.includes(f.id)).map(f => ({ id: String(f.id), key: f.key, options: (f.field_options || []).sort((a, b) => a.order_index - b.order_index).map(o => ({ id: String(o.id), value_key: o.value_key, iconUrl: o.icon_path ? getPublicUrl('games', o.icon_path) || undefined : undefined, color: o.color || undefined })) }));

  return (
    <>
      <AdminHeader params={paramsPromise} />
      <EditSectionClient 
        game={game} 
        section={section} 
        fields={fields} 
        displaySettings={dsRes.data as SectionDisplaySettings} 
        entities={processedEntities} 
        filterFieldsData={filterData} 
        currentLang={lang} 
        updateDisplaySettingsAction={updateDisplaySettingsAction.bind(null, gameSlug, sectionId)} 
        sectionTeams={tRes.data || []} 
        sectionStats={statsRes.data || []}
        sectionAscensions={ascRes.data || []}
        abilityTemplates={templatesRes.data || []}
      />
    </>
  );
}
