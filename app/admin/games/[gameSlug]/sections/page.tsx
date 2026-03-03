import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGameBySlug, getPublicUrl } from "@/lib/supabase/queries";
import { redirect } from 'next/navigation'
import { LocalizedString, getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';

type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  default_lang: string;
  supported_languages: string[];
}

type Section = {
  id: string;
  key: LocalizedString;
  icon_path: string | null;
}

type PageProps = {
  params: Promise<{ gameSlug: string }>
}

export default async function SectionsPage({ params: paramsPromise }: PageProps) {
  const { gameSlug } = await paramsPromise
  if (!gameSlug) redirect('/admin/games')

  const supabase = await createClient()

  // 1. Fetch game (cached)
  const { data: game } = await getGameBySlug(gameSlug);
  if (!game) redirect('/admin/games')

  // 2. Fetch sections and headers in parallel
  const [sectionsRes, headersList] = await Promise.all([
    supabase
      .from('game_sections')
      .select('id, key, icon_path')
      .eq('game_id', game.id)
      .order('order_index', { ascending: true }),
    headers()
  ]);

  const sections = sectionsRes.data;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {getTranslatedField(game.name, currentLang, game.default_lang)}
            <MissingTranslationIndicator value={game.name} />
            — {getTranslation('sections', currentLang)}
          </h1>

          <Link
            href={`/admin/games/${gameSlug}/sections/new`}
            prefetch={false}
            className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition"
          >
            {getTranslation('createSection', currentLang)}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections && sections.length > 0 ? (
            sections.map(section => {
              const iconUrl = getPublicUrl('games', section.icon_path);

              return (
                <Link
                  key={section.id}
                  href={`/admin/games/${gameSlug}/sections/${section.id}`}
                  prefetch={false}
                  className="border rounded p-4 hover:bg-gray-800 transition-colors flex items-center gap-4"
                >
                  {iconUrl && (
                    <img
                      src={iconUrl}
                      alt={getTranslatedField(section.key, currentLang, game.default_lang)}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <span className="font-medium flex items-center gap-2">
                    {getTranslatedField(section.key, currentLang, game.default_lang)}
                    <MissingTranslationIndicator value={section.key} />
                  </span>
                </Link>
              )
            })
          ) : (
            <p className="text-gray-400">{getTranslation('noSections', currentLang)}</p>
          )}
        </div>
      </main>
    </GameLocalizationProvider>
  )
}
