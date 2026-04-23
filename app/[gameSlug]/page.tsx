import { createPublicClient } from "@/lib/supabase/server";
import { getGameBySlug } from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import { LocalizedString, getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";

// Enable ISR
export const revalidate = 3600;

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data: games } = await supabase.from('games').select('slug');
  return (games || []).map((game) => ({
    gameSlug: game.slug,
  }));
}

// --- Type Definitions ---
type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

type PageProps = {
  params: Promise<{ gameSlug: string }>;
};

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug } = await paramsPromise;
  const gameRes = await getGameBySlug(gameSlug);
  const game = gameRes.data as Game | null;

  if (!game) return { title: 'Game Not Found' };

  const currentLang = game.default_lang || 'en';
  const title = getTranslatedField(game.name, currentLang, game.default_lang || 'en');
  const description = getTranslatedField(game.description, currentLang, game.default_lang || 'en');
  const coverImageUrl = game.cover_url ? getPublicUrl('games', game.cover_url) : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(coverImageUrl ? { images: [{ url: coverImageUrl, width: 800, height: 600, alt: title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(coverImageUrl ? { images: [coverImageUrl] } : {}),
    },
  };
}

export default async function GameDetailPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug } = params;
  const supabase = createPublicClient();

  const gameRes = await getGameBySlug(gameSlug);
  const game = gameRes.data as Game | null;
  const gameError = gameRes.error;

  if (gameError || !game) {
    redirect("/");
  }

  const { data: sections } = await supabase
    .from("game_sections")
    .select("id, key, icon_path, color")
    .eq("game_id", game.id)
    .order("order_index", { ascending: true });

  const coverUrl = getPublicUrl('games', game.cover_url);
  const currentLang = game.default_lang;

  const sortedSections = [...(sections || [])].sort((a, b) => {
    const nameA = getTranslatedField(a.key, currentLang, game.default_lang).trim();
    const nameB = getTranslatedField(b.key, currentLang, game.default_lang).trim();
    return nameA.localeCompare(nameB, currentLang, { sensitivity: 'base' });
  });

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        {coverUrl && (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover grayscale blur-md opacity-25 scale-105"
            priority
          />
        )}
        <div className="absolute inset-0 bg-zinc-50/60 dark:bg-black/80" />
      </div>

      <GameLocalizationProvider 
        gameDefaultLang={game.default_lang} 
        gameSupportedLanguages={game.supported_languages}
      >
        <GSBackground isHidden={!!coverUrl} />
        
        <Header breadcrumbs={[{ href: '/', label: getTranslation('home', currentLang) }, { href: `/${gameSlug}`, label: getTranslatedField(game.name, currentLang, game.default_lang) }]} />

        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex items-center gap-6">
              {coverUrl && (
                <Image
                  src={coverUrl}
                  alt={getTranslatedField(game.name, currentLang, game.default_lang)}
                  width={128}
                  height={128}
                  className="rounded-2xl shadow-lg border border-zinc-300 dark:border-zinc-700"
                  priority
                />
              )}
              <h1 className="text-5xl font-extrabold text-black dark:text-zinc-50 tracking-tight uppercase">
                {getTranslatedField(game.name, currentLang, game.default_lang)}
              </h1>
            </div>

            {game.description && (
              <div className="text-zinc-600 dark:text-zinc-400 text-lg">
                {getTranslatedField(game.description, currentLang, game.default_lang)}
              </div>
            )}

            <section className="space-y-6">
              <h2 className="text-3xl font-bold text-black dark:text-zinc-50">{getTranslation('sections', currentLang)}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {sortedSections && sortedSections.length > 0 ? (
                  sortedSections.map((section) => {
                    const sectionIconUrl = getPublicUrl('games', section.icon_path);
                    return (
                      <Link
                        key={section.id}
                        href={`/${game.slug}/sections/${section.id}`}
                        className="group flex flex-col items-center justify-center p-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm hover:shadow-lg hover:shadow-[#22c55e]/20 hover:-translate-y-1 transition-all duration-300 hover:border-[#22c55e]/50"
                      >
                        {sectionIconUrl ? (
                          <div className="relative w-16 h-16 mb-4">
                            <Image
                              src={sectionIconUrl}
                              alt={getTranslatedField(section.key, currentLang, game.default_lang)}
                              fill
                              sizes="64px"
                              className="object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                            />
                          </div>
                        ) : (
                          <div 
                            className="w-16 h-16 flex items-center justify-center text-zinc-400 text-3xl mb-4 border border-zinc-300 dark:border-zinc-700 rounded-full"
                            style={{ backgroundColor: section.color || 'transparent' }}
                          >
                            ?
                          </div>
                        )}
                        <h3 className="font-bold text-xl text-black dark:text-zinc-50 group-hover:text-[#22c55e] transition-colors uppercase tracking-wide text-center">
                          {getTranslatedField(section.key, currentLang, game.default_lang)}
                        </h3>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-zinc-500 col-span-full text-center">{getTranslation('noSections', currentLang)}</p>
                )}
              </div>
            </section>
          </div>
        </main>
      </GameLocalizationProvider>
    </div>
  );
}
