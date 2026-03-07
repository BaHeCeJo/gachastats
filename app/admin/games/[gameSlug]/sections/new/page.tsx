import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslatedField } from "@/lib/localization-utils";
import NewSectionClient from './NewSectionClient';
import { Game } from '@/lib/supabase/queries';
import AdminHeader from '@/app/admin/components/AdminHeader';

type PageProps = { params: Promise<{ gameSlug: string }>; };

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug } = await params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('name').eq('slug', gameSlug).single();
  return { title: game?.name ? `Add Section to ${getTranslatedField(game.name, 'en', 'en')} - Admin` : 'Add Section - Admin' };
}

export default async function NewSectionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug } = params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('id, name, slug, default_lang, supported_languages').eq('slug', gameSlug).single();
  if (!game) redirect('/admin/games');
  return (
    <>
      <AdminHeader params={paramsPromise} />
      <NewSectionClient game={game as Game} />
    </>
  );
}
