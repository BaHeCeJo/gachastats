import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslatedField } from "@/lib/localization-utils";
import NewFieldClient from './NewFieldClient';
import { Game, Section } from '@/lib/supabase/queries';
import AdminHeader from '@/app/admin/components/AdminHeader';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string }>; };

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug, sectionId } = await params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('name').eq('slug', gameSlug).single();
  const { data: section } = await supabase.from('game_sections').select('key').eq('id', sectionId).single();
  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  return { title: `Add Field to ${sectionName} in ${gameName} - Admin` };
}

export default async function NewFieldPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createServerClient();

  const { data: game } = await supabase.from('games').select('id, name, slug, default_lang, supported_languages').eq('slug', gameSlug).single();
  if (!game) redirect('/admin/games');

  const { data: section } = await supabase.from('game_sections').select('id, key, game_id').eq('id', sectionId).single();
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  const { data: existingFields } = await supabase.from('section_fields').select('category, game_field_id').eq('section_id', sectionId);
  const categories = Array.from(new Set(existingFields?.map(f => f.category).filter(Boolean) || [])) as string[];
  const usedGameFieldIds = existingFields?.map(f => f.game_field_id).filter(Boolean) || [];

  let query = supabase
    .from('game_fields')
    .select('*')
    .eq('game_id', game.id);
  
  if (usedGameFieldIds.length > 0) {
    query = query.not('id', 'in', `(${usedGameFieldIds.join(',')})`);
  }

  const { data: gameFields, error: gfError } = await query.order('internal_name', { ascending: true });
  
  if (gfError) {
    console.error("Error fetching game fields:", gfError);
  }

  return (
    <>
      <AdminHeader params={paramsPromise} />
      <NewFieldClient game={game as Game} section={section as Section} categories={categories} gameFields={gameFields || []} />
    </>
  );
}
