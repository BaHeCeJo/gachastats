import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { getTranslatedField } from "@/lib/localization-utils";
import EditFieldClient from './EditFieldClient';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string; fieldId: string }>; };

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug, sectionId, fieldId } = await params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('name').eq('slug', gameSlug).single();
  const { data: section } = await supabase.from('game_sections').select('key').eq('id', sectionId).single();
  const { data: field } = await supabase.from('section_fields').select('key').eq('id', fieldId).single();

  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  const fieldName = field?.key ? getTranslatedField(field.key, 'en', 'en') : 'Field';

  return { title: `Edit ${fieldName} in ${sectionName} (${gameName}) - Admin` };
}

export default async function EditFieldPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId, fieldId } = params;
  const supabase = await createServerClient();

  const { data: game } = await supabase.from('games').select('id, name, slug, default_lang, supported_languages').eq('slug', gameSlug).single();
  if (!game) redirect('/admin/games');

  const { data: section } = await supabase.from('game_sections').select('id, key, game_id').eq('id', sectionId).single();
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  const { data: field } = await supabase.from('section_fields').select('*').eq('id', fieldId).single();
  if (!field) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);

  const { data: existingFields } = await supabase.from('section_fields').select('category').eq('section_id', sectionId);
  const categories = Array.from(new Set(existingFields?.map(f => f.category).filter(Boolean) || [])) as string[];

  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  return <EditFieldClient game={game} section={section} field={field as any} categories={categories} currentLang={currentLang} />;
}
