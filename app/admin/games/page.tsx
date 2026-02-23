// /admin/games/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteGameAction } from '@/app/admin/games/actions'
import ConfirmButton from '@/app/components/ConfirmButton'
import { LocalizedString, getTranslatedField } from "@/lib/localization-utils"; // Server-safe utilities
import { GameLocalizationProvider } from "@/lib/localization"; // Client-side provider

type Game = {
  id: string;
  name: LocalizedString; // Name is now localized
  slug: string;
  cover_url: string | null;
  default_lang: string; // Add default_lang
  supported_languages: string[]; // Add supported_languages
};

export default async function AdminGamesPage() {
  const supabase = await createClient()

  // Fetch games including cover_url and language settings
  const { data: games } = await supabase
    .from('games')
    .select('id, name, slug, cover_url, default_lang, supported_languages') // Include language fields
    .order('name->>en', { ascending: true }) // Order by English name as a default for admin list

  // For server components, we'll hardcode 'en' for now or derive from request headers/cookies.
  // A client-side context for currentLang will be implemented later.
  const currentLang = 'en'; // Temporarily hardcode for server component

  return (
    <main className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Games</h1>
        <Link
          href="/admin/games/new"
          prefetch={false}
          className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition"
        >
          Create game
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games && games.length > 0 ? (
          games.map(game => {
            // Get public URL if cover exists
            const coverUrl = game.cover_url
              ? supabase.storage.from('games').getPublicUrl(game.cover_url).data.publicUrl
              : null

            return (
              <GameLocalizationProvider key={game.id} gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
                <div className="border rounded p-4 hover:bg-gray-800 transition-colors flex flex-col gap-4">
                  <Link
                    href={`/admin/games/${game.slug}`}
                    prefetch={false}
                    className="flex items-center gap-4 flex-grow"
                  >
                    {coverUrl && (
                      <img
                        src={coverUrl}
                        alt={getTranslatedField(game.name, currentLang, game.default_lang)}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <span className="font-medium text-lg">{getTranslatedField(game.name, currentLang, game.default_lang)}</span>
                  </Link>
                  
                  <div className="flex justify-end border-t pt-2">
                    <form action={deleteGameAction.bind(null, game.id)}>
                      <ConfirmButton>Delete</ConfirmButton>
                    </form>
                  </div>
                </div>
              </GameLocalizationProvider>
            )
          })
        ) : (
          <p className="text-gray-400">No games created yet.</p>
        )}
      </div>
    </main>
  )
}
