import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslatedField, LocalizedString } from '@/lib/localization-utils';
import EditGameClient from './EditGameClient';

type GameData = {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

type PageProps = { params: Promise<{ gameSlug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug } = await params;
  const supabase = await createServerClient();
  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  const { data: game } = await supabase
    .from('games')
    .select('name, default_lang')
    .eq('slug', gameSlug)
    .single();

  const gameName = game?.name ? getTranslatedField(game.name, currentLang, game.default_lang || 'en') : 'Game';

  return {
    title: `Edit ${gameName} - Admin`,
  };
}

export default async function ServerAdminGamePage({ params }: PageProps) {
  const { gameSlug } = await params;
  const supabase = await createServerClient();
  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug, description, cover_url, default_lang, supported_languages')
    .eq('slug', gameSlug)
    .single<GameData>();

  if (!game) redirect('/admin/games');

  return <EditGameClient game={game} currentLang={currentLang} />;
}
