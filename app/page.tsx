import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import Header from "./components/Header"
import GSIntro from "./components/GSIntro"
import GSBackground from "./components/GSBackground"

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
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <GSIntro />
      <GSBackground />
      <Header />
      
      <main className="flex-1 px-8 py-24 z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-extrabold text-center mb-16 text-black dark:text-zinc-50 tracking-tight">
            Explore <span className="text-indigo-600">Universes</span>
          </h1>

          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {games?.map((game) => {
              const coverUrl = game.cover_url
                ? supabase.storage
                    .from("games")
                    .getPublicUrl(game.cover_url).data.publicUrl
                : null

              return (
                <li
                  key={game.id}
                  className="group relative border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  <Link href={`/${game.slug}`} className="block">
                    <div className="relative h-48 w-full overflow-hidden">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={game.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                          No Preview
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className="p-5">
                      <h3 className="font-bold text-xl text-black dark:text-zinc-50 group-hover:text-indigo-600 transition-colors">
                        {game.name}
                      </h3>
                      <p className="text-sm text-zinc-500 mt-1">View Collection →</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>

          {games?.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
              <p className="text-zinc-500">No games have been added to the archives yet.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full text-center py-10 bg-white/30 dark:bg-black/30 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 z-10">
        <p className="text-zinc-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase">
          &copy; {new Date().getFullYear()} GachaStats / GS
        </p>
      </footer>
    </div>
  )
}
