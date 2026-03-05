import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslatedField } from '@/lib/localization-utils';
import { GameLocalizationProvider } from '@/lib/localization';
import Link from 'next/link';
import { LocalizedString } from '@/lib/supabase/queries';
import { PostgrestError } from '@supabase/supabase-js';
import AdminHeader from '@/app/admin/components/AdminHeader';

type PageProps = { params: Promise<{ gameSlug: string }> };

interface SectionFieldWithGameSection {
  id: string;
  key: LocalizedString;
  game_sections: {
    id: string;
    key: LocalizedString;
  } | null;
}

interface GameFieldWithSections {
  id: string;
  internal_name: string;
  manual_fill: boolean;
  has_icon: boolean;
  has_color: boolean;
  section_fields: SectionFieldWithGameSection[];
}

export default async function GameFieldsPage({ params }: PageProps) {
  const { gameSlug } = await params;
  const supabase = await createServerClient();
  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug, default_lang, supported_languages')
    .eq('slug', gameSlug)
    .single();

  if (!game) redirect('/admin/games');

  const { data: gameFields, error } = await supabase
    .from('game_fields')
    .select(`
      id, internal_name, manual_fill, has_icon, has_color,
      section_fields (
        id, key,
        game_sections ( id, key )
      )
    `)
    .eq('game_id', game.id)
    .order('internal_name', { ascending: true }) as { data: GameFieldWithSections[] | null, error: PostgrestError | null };

  if (error) {
    return (
      <div className="p-8 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl max-w-5xl mx-auto mt-10">
        <h2 className="font-bold mb-2">Error Fetching Shared Fields</h2>
        <pre className="text-xs">{JSON.stringify(error, null, 2)}</pre>
        <Link href={`/admin/games/${gameSlug}`} className="mt-4 inline-block text-white underline">Back to Game</Link>
      </div>
    );
  }

  const fieldsCount = gameFields?.length || 0;

  return (
    <>
      <AdminHeader params={params} />
      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <main className="max-w-5xl p-8 space-y-8 mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {getTranslatedField(game.name, currentLang, game.default_lang)} — Shared Fields ({fieldsCount})
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Fields defined at the game level that can be reused in any section.</p>
          </div>
          <Link href={`/admin/games/${gameSlug}`} className="text-zinc-400 hover:text-white transition">
            ← Back to Game
          </Link>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-800/50 text-zinc-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">Internal Name</th>
                <th className="px-6 py-4 font-bold">Config</th>
                <th className="px-6 py-4 font-bold">Used In Sections</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {gameFields?.map((gf) => (
                <tr key={gf.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-zinc-300">{gf.internal_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {gf.manual_fill && <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-500/20">MANUAL</span>}
                      {gf.has_icon && <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-500/20">ICON</span>}
                      {gf.has_color && <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/20">COLOR</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {gf.section_fields?.map((sf) => (
                        <Link 
                          key={sf.id}
                          href={`/admin/games/${gameSlug}/sections/${sf.game_sections?.id}/fields/${sf.id}`}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-2 py-1 rounded text-xs transition border border-zinc-700"
                        >
                          {getTranslatedField(sf.game_sections?.key || {}, currentLang, game.default_lang)}
                        </Link>
                      ))}
                      {(!gf.section_fields || gf.section_fields.length === 0) && (
                        <span className="text-zinc-600 italic">Not used yet</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                     {/* For now, just a delete or edit would be nice, but since they are managed via sections, we link to one */}
                     <span className="text-zinc-500 italic text-[10px]">Managed via sections</span>
                  </td>
                </tr>
              ))}
              {(!gameFields || gameFields.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">
                    No shared fields found for this game. Create one in a section to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </GameLocalizationProvider>
    </>
  );
}
