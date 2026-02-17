// /admin/games/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminGamesPage() {
  const supabase = await createClient()

  // Fetch games including cover_url
  const { data: games } = await supabase
    .from('games')
    .select('id, name, slug, cover_url')
    .order('name', { ascending: true })

  return (
    <main className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Games</h1>
        <Link
          href="/admin/games/new"
          prefetch={false}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
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
              <Link
                key={game.id}
                href={`/admin/games/${game.slug}`}
                prefetch={false}
                className="border rounded p-4 hover:bg-gray-800 transition-colors flex items-center gap-4"
              >
                {coverUrl && (
                  <img
                    src={coverUrl}
                    alt={game.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <span className="font-medium">{game.name}</span>
              </Link>
            )
          })
        ) : (
          <p className="text-gray-400">No games created yet.</p>
        )}
      </div>
    </main>
  )
}
