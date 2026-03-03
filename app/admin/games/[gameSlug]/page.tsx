import { getGameBySlug, Game } from "@/lib/supabase/queries";
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslatedField } from '@/lib/localization-utils';
import EditGameClient from './EditGameClient';

type PageProps = { params: Promise<{ gameSlug: string }> };

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug } = await paramsPromise;
  const [gameRes, headersList] = await Promise.all([
    getGameBySlug(gameSlug),
    headers()
  ]);
  const game = gameRes.data as Game | null;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  const gameName = game?.name ? getTranslatedField(game.name, currentLang, game.default_lang || 'en') : 'Game';

  return {
    title: `Edit ${gameName} - Admin`,
  };
}

export default async function ServerAdminGamePage({ params: paramsPromise }: PageProps) {
  const { gameSlug } = await paramsPromise;
  const [gameRes, headersList] = await Promise.all([
    getGameBySlug(gameSlug),
    headers()
  ]);

  const game = gameRes.data as Game | null;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  if (!game) redirect('/admin/games');

  return <EditGameClient game={game} currentLang={currentLang} />;
}
