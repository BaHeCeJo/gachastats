import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()

  const { data: games, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("HOME PAGE GAMES ERROR:", error)
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">

      {/* Main content */}
      <main className="flex-1 px-8 py-24">
        <h1 className="text-4xl font-bold text-center mb-12 text-black dark:text-zinc-50">
          Games
        </h1>

        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {games?.map((game) => {
            const imageUrl = game.cover_image
              ? supabase.storage
                  .from("games")
                  .getPublicUrl(game.cover_image).data.publicUrl
              : null

            return (
              <li
                key={game.id}
                className="border rounded-lg bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <Link href={`/${game.slug}`} className="block">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={game.name}
                      className="w-full h-40 object-cover"
                    />
                  )}

                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-black dark:text-zinc-50">
                      {game.name}
                    </h3>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        {games?.length === 0 && (
          <p className="text-center text-zinc-500 mt-12">
            No games available yet.
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-zinc-600 dark:text-zinc-400">
          &copy; {new Date().getFullYear()} My Homepage. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
