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

  const { data: section } = await supabase.from('game_sections').select('id, key, game_id').eq('id', sectionId).single();
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  const { data: entity, error: entityError } = await supabase.from("section_entities").select(`
    id, section_id, name, icon_path,
    entity_skins (
      id, entity_id, name, is_default,
      entity_images ( id, type, key, image_path, width, height, order_index )
    )
  `).eq("id", entityId).single();

  if (entityError || !entity) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/entities`);

  for (const skin of entity.entity_skins) {
    for (const image of skin.entity_images) {
      if (image.image_path) {
        image.publicUrl = image.image_path.startsWith("http") ? image.image_path : supabase.storage.from("games").getPublicUrl(image.image_path).data.publicUrl;
      }
    }
  }

  // Debug: Try a simpler fetch first
  const { data: simpleFields, error: simpleError } = await supabase.from('section_fields').select('id').eq('section_id', sectionId);
  console.log("Debug Simple Fields Fetch:", { sectionId, count: simpleFields?.length, error: simpleError });

  // Fetch all fields for this section
  const { data: fields, error: fieldsError } = await supabase
    .from("section_fields")
    .select('id, key, required, manual_fill, is_multi, has_icon, has_color, category, order_index, field_options(id, value_key, icon_path, color, order_index)')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true });

  if (fieldsError) {
    console.error("Error fetching section fields:", fieldsError);
  }

  const { data: entityFieldValuesData, error: valuesError } = await supabase.from('entity_field_values').select('field_id, value_text, option_id').eq('entity_id', entityId);
  
  if (valuesError) {
    console.error("Error fetching entity values:", valuesError);
  }

  return <EditEntityClient game={game} section={section} entity={{ ...entity, entity_field_values: entityFieldValuesData || [] } as any} fields={fields || []} currentLang={currentLang} />;
}
