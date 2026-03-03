import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslatedField } from "@/lib/localization-utils";
import NewEntityClient from './NewEntityClient';
import { Game, Section, SectionField, FieldOption } from '@/lib/supabase/queries';

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

  const { data: fieldsRaw } = await supabase
    .from('section_fields')
    .select(`
      id, key, required, is_multi, category, order_index, game_field_id,
      game_fields (
        manual_fill, has_icon, has_color
      )
    `)
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true }) as { data: SectionField[] | null };

  const gameFieldIds = (fieldsRaw || []).map(f => f.game_field_id).filter(Boolean);
  const { data: allOptions } = gameFieldIds.length > 0
    ? await supabase.from('field_options').select('id, game_field_id, value_key, icon_path, color, order_index').in('game_field_id', gameFieldIds) as { data: FieldOption[] | null }
    : { data: [] };

  const fields = (fieldsRaw || []).map(f => {
    const gf = f.game_fields;
    const options = (allOptions || []).filter((opt) => opt.game_field_id === f.game_field_id);
    return {
      ...f,
      manual_fill: gf?.manual_fill,
      has_icon: gf?.has_icon,
      has_color: gf?.has_color,
      field_options: options || []
    };
  });

  return <NewEntityClient game={game as Game} section={section as Section} fields={fields} currentLang={currentLang} />;
}
