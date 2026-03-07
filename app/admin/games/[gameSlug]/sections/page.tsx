import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getGameBySlug, Section } from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect } from 'next/navigation'
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import AdminHeader from '@/app/admin/components/AdminHeader';

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

  const sections = sectionsRes.data as Section[] | null;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  return (
    <>
      <AdminHeader params={paramsPromise} />
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
                  className="border rounded p-4 border-zinc-800 hover:bg-zinc-800 transition-colors flex items-center gap-4"
                >
                  {iconUrl && (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={iconUrl}
                        alt={getTranslatedField(section.key, currentLang, game.default_lang)}
                        fill
                        sizes="48px"
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <span className="font-medium flex items-center gap-2 text-zinc-200">
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
    </>
  )
}
