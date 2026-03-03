import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGameBySlug, getSectionById, getPublicUrl } from "@/lib/supabase/queries";
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
  game_id: string;
}

type Entity = {
  id: string;
  name: LocalizedString;
  entity_images: {
    id: string;
    type: string;
    image_path: string;
  }[];
}

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}

export default async function EntitiesPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise
  if (!gameSlug || !sectionId) redirect('/admin/games')

  const supabase = await createClient()

  // 1. Fetch game (cached)
  const { data: game } = await getGameBySlug(gameSlug);
  if (!game) redirect('/admin/games')

  // 2. Parallelize everything else
  const [sectionRes, entitiesRes, headersList] = await Promise.all([
    getSectionById(sectionId),
    supabase
      .from('section_entities')
      .select(`
        id,
        name,
        entity_images (
          id,
          type,
          image_path
        )
      `)
      .eq('section_id', sectionId)
      .order(`name->>${game.default_lang}`, { ascending: true }),
    headers()
  ]);

  const section = sectionRes.data;
  const entities = entitiesRes.data as Entity[] | null;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {getTranslatedField(section.key, currentLang, game.default_lang)} — {getTranslation('entities', currentLang)}
          </h1>

          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/new`}
            className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition"
            prefetch={false}
          >
            {getTranslation('createEntity', currentLang)}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entities?.length ? (
            entities.map(entity => {
              const icon = entity.entity_images?.find(i => i.type === 'icon')
              const iconUrl = icon ? getPublicUrl('games', icon.image_path) : null;

              return (
                <Link
                  key={entity.id}
                  href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`}
                  className="border rounded p-4 flex items-center gap-4 hover:bg-zinc-800 border-zinc-800 bg-zinc-900/50"
                >
                  {iconUrl && (
                    <img
                      src={iconUrl}
                      alt={getTranslatedField(entity.name, currentLang, game.default_lang)}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}

                  <span className="font-medium flex items-center gap-2">
                    {getTranslatedField(entity.name, currentLang, game.default_lang)}
                    <MissingTranslationIndicator value={entity.name} />
                  </span>
                </Link>
              )
            })
          ) : (
            <p className="text-zinc-400">{getTranslation('noEntities', currentLang)}</p>
          )}
        </div>
      </main>
    </GameLocalizationProvider>
  )
}
