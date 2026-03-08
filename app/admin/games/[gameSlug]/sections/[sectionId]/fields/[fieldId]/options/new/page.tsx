import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from "next/headers";
import { getTranslatedField } from "@/lib/localization-utils";
import NewOptionClient from './NewOptionClient';
import { LocalizedString, Game } from '@/lib/supabase/queries';
import AdminHeader from '@/app/admin/components/AdminHeader';

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string; fieldId: string }>; };

interface SectionFieldWithGameField {
  id: string;
  key: LocalizedString;
  game_fields: {
    manual_fill: boolean;
    has_icon: boolean;
    has_color: boolean;
  } | null;
}

export async function generateMetadata({ params }: PageProps) {
  const { gameSlug, sectionId, fieldId } = await params;
  const supabase = await createServerClient();
  const { data: game } = await supabase.from('games').select('name').eq('slug', gameSlug).single();
  const { data: section } = await supabase.from('game_sections').select('key').eq('id', sectionId).single();
  const { data: field } = await supabase.from('section_fields').select('key').eq('id', fieldId).single();

  const gameName = game?.name ? getTranslatedField(game.name, 'en', 'en') : 'Game';
  const sectionName = section?.key ? getTranslatedField(section.key, 'en', 'en') : 'Section';
  const fieldName = field?.key ? getTranslatedField(field.key, 'en', 'en') : 'Field';

  return { title: `Add Option to ${fieldName} in ${sectionName} (${gameName}) - Admin` };
}

export default async function NewFieldOptionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId, fieldId } = params;
  const supabase = await createServerClient();

  const { data: game } = await supabase.from('games').select('id, name, slug, default_lang, supported_languages').eq('slug', gameSlug).single();
  if (!game) redirect('/admin/games');

  const { data: fieldRaw } = await supabase
    .from('section_fields')
    .select(`
      id, 
      key, 
      game_fields (
        manual_fill, has_icon, has_color
      )
    `)
    .eq('id', fieldId)
    .single() as { data: SectionFieldWithGameField | null };

  if (!fieldRaw) redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);

  const gf = Array.isArray(fieldRaw.game_fields) ? fieldRaw.game_fields[0] : fieldRaw.game_fields;
  const field = {
    id: fieldRaw.id,
    key: fieldRaw.key,
    manual_fill: gf?.manual_fill ?? false,
    has_icon: gf?.has_icon ?? false,
    has_color: gf?.has_color ?? false,
  };

  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  return (
    <>
      <AdminHeader params={paramsPromise} />
      <NewOptionClient game={game as Game} field={field} sectionId={sectionId} currentLang={currentLang} />
    </>
  );
}
