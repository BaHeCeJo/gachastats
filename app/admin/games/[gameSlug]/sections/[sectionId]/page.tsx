import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getTranslatedField, LocalizedString } from "@/lib/localization-utils";
import EditSectionClient from './EditSectionClient';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string }>; };

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug, sectionId } = await params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('name').eq('slug', gameSlug).single();
  const { data: section } = await supabase.from('game_sections').select('key').eq('id', sectionId).single();
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
  revalidatePath(`/admin/games/${gameSlug}/sections/${sectionId}`);
  return { error: undefined };
}

export default async function EditSectionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from("games").select("id, name, slug, default_lang, supported_languages").eq("slug", gameSlug).single();
  if (!game) redirect("/admin/games");

  const { data: section } = await supabase.from("game_sections").select("id, key, game_id, icon_path, color, order_index").eq("id", sectionId).eq("game_id", game.id).single();
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  const { data: fieldsRaw } = await supabase
    .from("section_fields")
    .select(`
      id, key, required, is_multi, category, order_index, game_field_id,
      game_fields (
        id, game_id, internal_name, manual_fill, has_icon, has_color
      )
    `)
    .eq("section_id", sectionId)
    .order("order_index", { ascending: true });

  // Fetch all game-level fields for this game (Shared Fields) + their options
  const { data: allGameFields } = await supabase
    .from('game_fields')
    .select('*, field_options(id, value_key)')
    .eq('game_id', game.id)
    .order('internal_name', { ascending: true });

  const gameFieldIds = (fieldsRaw || []).map(f => f.game_field_id).filter(Boolean);
  const { data: allOptions } = gameFieldIds.length > 0 
    ? await supabase.from('field_options').select('id, game_field_id, value_key, icon_path, color, order_index').in('game_field_id', gameFieldIds)
    : { data: [] };

  const fields = (fieldsRaw || []).map((f: any) => {
    // Robust extraction of the shared game_field definition
    const gf = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    const options = (allOptions || []).filter((opt: any) => opt.game_field_id === f.game_field_id);
    return {
      ...f,
      manual_fill: gf?.manual_fill,
      has_icon: gf?.has_icon,
      has_color: gf?.has_color,
      field_options: options || []
    };
  });

  const { data: displaySettings } = await supabase.from("section_display_settings").select("*").eq("section_id", sectionId).single();
  
  const { data: entities } = await supabase
    .from("section_entities")
    .select(`
      id, section_id, name, icon_path, 
      entity_skins (is_default, entity_images (image_path)), 
      entity_field_values (id, game_field_id, value_text, option_id, field_options (color, icon_path, value_key))
    `)
    .eq("section_id", sectionId)
    .eq("entity_skins.is_default", true)
    .order(`name->>${game.default_lang}`, { ascending: true });

  const headersList = await headers();
  const cookiesList = headersList.get('cookie') || '';
  const userLang = cookiesList.split('; ').find(row => row.startsWith('user_lang='))?.split('=')[1];
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  
  const currentLang = userLang || browserLang;
  
  // Create map by game_field_id for entity values processing
  const gameFieldsMap = new Map((fields || [])?.map(f => [f.game_field_id, f]));

  const processedEntities = (entities || []).map((entity: any) => {
    const skin = entity.entity_skins?.[0];
    const iconPath = skin?.entity_images?.[0]?.image_path;
    let publicIconUrl = iconPath ? (iconPath.startsWith("http") ? iconPath : supabase.storage.from("games").getPublicUrl(iconPath).data.publicUrl) : "";
    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};
    
    entity.entity_field_values?.forEach((val: any) => {
      const field = gameFieldsMap.get(val.game_field_id);
      if (!field) return;
      const fieldId = field.id;

      if (!allValues[fieldId]) allValues[fieldId] = [];
      
      if (val.option_id) {
        // If it's an option, we use the option_id for filtering
        allValues[fieldId].push(String(val.option_id));
      } else {
        // For manual fill fields, we use the translated text value(s)
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
          iconUrl: opt.icon_path ? (opt.icon_path.startsWith("http") ? opt.icon_path : supabase.storage.from("games").getPublicUrl(opt.icon_path).data.publicUrl) : undefined 
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
          iconUrl: opt.icon_path ? (opt.icon_path.startsWith("http") ? opt.icon_path : supabase.storage.from("games").getPublicUrl(opt.icon_path).data.publicUrl) : undefined, 
          color: opt.color 
        })) 
    })) || [];

  return <EditSectionClient game={game as any} section={section as any} fields={fields as any} gameFields={allGameFields || []} displaySettings={displaySettings as any} entities={processedEntities} filterFieldsData={filterFieldsData} currentLang={currentLang} updateDisplaySettingsAction={updateDisplaySettingsAction} />;
}
