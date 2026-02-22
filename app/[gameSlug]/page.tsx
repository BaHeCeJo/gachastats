import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground"; // For consistent background layering

type PageProps = {
  params: { gameSlug: string };
};

export default async function GameDetailPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug } = params;
  const supabase = await createClient();

  // Fetch game details
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url")
    .eq("slug", gameSlug)
    .single();

  if (gameError || !game) {
    console.error("Game fetch error:", gameError?.message || "Game not found.");
    redirect("/"); // Redirect to home if game not found (e.g., due to RLS or bad slug)
  }

  // Fetch sections for the game
  const { data: sections, error: sectionsError } = await supabase
    .from("game_sections")
    .select("id, key, icon_path")
    .eq("game_id", game.id)
    .order("order_index", { ascending: true });

  if (sectionsError) {
    console.error("Sections fetch error:", sectionsError?.message);
  }

  const coverUrl = game.cover_url
    ? supabase.storage.from("games").getPublicUrl(game.cover_url).data.publicUrl
    : null;

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      {/* Background Cover */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale blur-md opacity-25 scale-105 transition-all duration-1000 ease-out"
          style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : "none" }}
        />
        {/* Subtle dark overlay to ensure readability */}
        <div className="absolute inset-0 bg-zinc-50/60 dark:bg-black/80" />
      </div>

      {/* GS logo as a lower layer for brand presence, hidden if cover is present */}
      <GSBackground isHidden={!!coverUrl} /> 
      <Header breadcrumbs={[{ href: '/', label: 'Home' }, { href: `/${gameSlug}`, label: game.name }]} />

      <main className="flex-1 px-8 py-24 z-10 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex items-center gap-6">
            {coverUrl && (
              <Image
                src={coverUrl}
                alt={game.name}
                width={128}
                height={128}
                className="rounded-2xl shadow-lg border border-zinc-300 dark:border-zinc-700"
              />
            )}
            <h1 className="text-5xl font-extrabold text-black dark:text-zinc-50 tracking-tight uppercase">
              {game.name}
            </h1>
          </div>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-black dark:text-zinc-50">Sections</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {sections && sections.length > 0 ? (
                sections.map((section) => {
                  const sectionIconUrl = section.icon_path
                    ? supabase.storage.from("games").getPublicUrl(section.icon_path).data.publicUrl
                    : null;
                  return (
                    <Link
                      key={section.id}
                      href={`/${game.slug}/sections/${section.id}`}
                      className="group flex flex-col items-center justify-center p-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm hover:shadow-lg hover:shadow-[#22c55e]/20 hover:-translate-y-1 transition-all duration-300 hover:border-[#22c55e]/50"
                    >
                      {sectionIconUrl ? (
                        <Image
                          src={sectionIconUrl}
                          alt={section.key}
                          width={64}
                          height={64}
                          className="w-16 h-16 object-contain mb-4 filter grayscale group-hover:grayscale-0 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-16 h-16 flex items-center justify-center text-zinc-400 text-3xl mb-4 border border-zinc-300 dark:border-zinc-700 rounded-full">
                          ?
                        </div>
                      )}
                      <h3 className="font-bold text-xl text-black dark:text-zinc-50 group-hover:text-[#22c55e] transition-colors uppercase tracking-wide text-center">
                        {section.key}
                      </h3>
                    </Link>
                  );
                })
              ) : (
                <p className="text-zinc-500 col-span-full text-center">No sections defined for this game yet.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
