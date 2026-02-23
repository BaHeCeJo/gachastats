import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { getTranslatedField } from "@/lib/localization-utils";
import EditOptionClient from './EditOptionClient';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string; fieldId: string; optionId: string }>; };

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug, sectionId, fieldId, optionId } = await params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('name').eq('slug', gameSlug).single();
  const { data: section } = await supabase.from('game_sections').select('key').eq('id', sectionId).single();
  const { data: field } = await supabase.from('section_fields').select('key').eq('id', fieldId).single();
  const { data: option } = await supabase.from('field_options').select('value_key').eq('id', optionId).single();

  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  const fieldName = field?.key ? getTranslatedField(field.key, 'en', 'en') : 'Field';
  const optionName = option?.value_key ? getTranslatedField(option.value_key, 'en', 'en') : 'Option';

  return { title: `Edit ${optionName} in ${fieldName} (${sectionName}, ${gameName}) - Admin` };
}

export default async function EditFieldOptionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId, fieldId, optionId } = params;
  const supabase = await createServerClient();

  const { data: game } = await supabase.from('games').select('id, name, slug, default_lang, supported_languages').eq('slug', gameSlug).single();
  if (!game) redirect('/admin/games');

  const { data: field } = await supabase.from('section_fields').select('id, key, manual_fill, has_icon, has_color').eq('id', fieldId).single();
  if (!field) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);

  const { data: option } = await supabase.from('field_options').select('*').eq('id', optionId).single();
  if (!option) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`);

  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  return <EditOptionClient game={game} field={field} option={option as any} sectionId={sectionId} currentLang={currentLang} />;
}
