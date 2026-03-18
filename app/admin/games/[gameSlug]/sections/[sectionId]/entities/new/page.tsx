import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslatedField } from "@/lib/localization-utils";
import NewEntityClient from './NewEntityClient';
import { Game, Section, getSectionFields, getSectionStats, getSectionAscensions, getSectionAbilityTemplates } from '@/lib/supabase/queries';
import AdminHeader from '@/app/admin/components/AdminHeader';

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

  const { data: section } = await supabase.from('game_sections').select('id, key, game_id, has_stats, has_ascension, max_level').eq('id', sectionId).single();
  if (!section) redirect(`/admin/games/${gameSlug}/sections`);

  const [fieldsRes, statsRes, ascRes, abilityTemplatesRes] = await Promise.all([
    getSectionFields(sectionId),
    getSectionStats(sectionId),
    getSectionAscensions(sectionId),
    getSectionAbilityTemplates(sectionId)
  ]);

  const fieldsRaw = fieldsRes.data || [];

  const fields = fieldsRaw.map(f => {
    const gf = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    return {
      id: f.id,
      key: f.key,
      required: f.required,
      is_multi: f.is_multi,
      category: f.category,
      order_index: f.order_index,
      manual_fill: gf?.manual_fill,
      has_icon: gf?.has_icon,
      has_color: gf?.has_color,
      field_options: gf?.field_options || []
    };
  });

  return (
    <>
      <AdminHeader params={paramsPromise} />
      <NewEntityClient 
        game={game as Game} 
        section={section as Section} 
        fields={fields} 
        currentLang={currentLang} 
        sectionStats={statsRes.data || []}
        sectionAscensions={ascRes.data || []}
        abilityTemplates={abilityTemplatesRes.data || []}
      />
    </>
  );
}
