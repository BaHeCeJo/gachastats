import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslatedField } from "@/lib/localization-utils";
import NewEntityClient from './NewEntityClient';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string }>; };

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug, sectionId } = await params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('name').eq('slug', gameSlug).single();
  const { data: section } = await supabase.from('game_sections').select('key').eq('id', sectionId).single();
  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  return { title: `Add Entity to ${sectionName} in ${gameName} - Admin` };
}

export default async function NewEntityPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createServerClient();
  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  const { data: game } = await supabase.from('games').select('id, name, slug, default_lang, supported_languages').eq('slug', gameSlug).single();
  if (!game) redirect('/admin/games');

  const { data: section } = await supabase.from('game_sections').select('id, key, game_id').eq('id', sectionId).single();
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  const { data: fields } = await supabase.from('section_fields').select('*, field_options(*)').eq('section_id', sectionId).order('order_index', { ascending: true });

  return <NewEntityClient game={game} section={section} fields={fields || []} currentLang={currentLang} />;
}
