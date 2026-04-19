import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers, cookies } from "next/headers";

type PageProps = {
  params: Promise<{ gameSlug: string }>;
};

export default async function GameCollectionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug } = params;
  
  console.log(`[DEBUG] Entering GameCollectionPage for slug: ${gameSlug}`);
  
  const supabase = await createClient();

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("[DEBUG] GameCollectionPage: No user found, redirecting to signin");
    redirect("/auth/signin");
  }

  // Fetch game details
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url, default_lang, supported_languages")
    .eq("slug", gameSlug)
    .single();

  if (gameError || !game) {
    console.log(`[DEBUG] GameCollectionPage: Game not found or error: ${gameError?.message}. Redirecting to /profile`);
    redirect("/profile");
  }

  console.log(`[DEBUG] GameCollectionPage: Found game ${game.id}`);

  // Fetch ONLY collectible sections for this game
  const { data: sections } = await supabase
    .from("game_sections")
    .select("id, key, icon_path, color")
    .eq("game_id", game.id)
    .eq("is_collectible", true)
    .order("order_index", { ascending: true });

  const coverUrl = game.cover_url
    ? supabase.storage.from("games").getPublicUrl(game.cover_url).data.publicUrl
    : null;

  // --- Language Detection ---
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = (await cookieStore).get('user_lang')?.value;
  const acceptLanguage = (await headersList).get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  const preferredLang = userLang || browserLang;
  const currentLang = game.supported_languages.includes(preferredLang) ? preferredLang : game.default_lang;

  return (
    <div className="relative flex flex-col min-h-screen bg-black font-sans text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale blur-md opacity-25 scale-105 transition-all duration-1000 ease-out"
          style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : "none" }}
        />
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <GameLocalizationProvider 
        gameDefaultLang={game.default_lang} 
        gameSupportedLanguages={game.supported_languages}
      >
        <GSBackground isHidden={!!coverUrl} />
        
        <Header breadcrumbs={[
          { href: "/profile", label: getTranslation('profile', currentLang) },
          { href: `/profile/${gameSlug}`, label: getTranslatedField(game.name, currentLang, game.default_lang) }
        ]} />

        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                {coverUrl && (
                  <div className="relative w-48 h-48 rounded-[2rem] overflow-hidden border-4 border-zinc-800 shadow-2xl bg-zinc-900">
                    <Image src={coverUrl} alt="" fill sizes="192px" className="object-cover" priority />
                  </div>
                )}
                <div className="space-y-4">
                  <h1 className="text-6xl font-black italic uppercase tracking-tighter text-[#22c55e]">
                    {getTranslatedField(game.name, currentLang, game.default_lang)}
                  </h1>
                  <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs">
                    {getTranslation('myCollection', currentLang)}
                  </p>
                </div>
              </div>

              <Link 
                href={`/${gameSlug}/optimizer`}
                className="px-8 py-4 bg-zinc-800/50 border-2 border-[#22c55e] rounded-2xl font-black uppercase italic tracking-widest hover:bg-[#22c55e] hover:text-black transition-all duration-300"
              >
                Open Simulator
              </Link>
            </div>

            <section className="space-y-10">
              <h2 className="text-3xl font-black italic uppercase tracking-widest flex items-center gap-4">
                <span className="w-12 h-1 bg-[#22c55e]" />
                {getTranslation('sections', currentLang)}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {sections && sections.length > 0 ? (
                  sections.map((section) => {
                    const sectionIconUrl = section.icon_path
                      ? supabase.storage.from("games").getPublicUrl(section.icon_path).data.publicUrl
                      : null;
                    return (
                      <Link
                        key={section.id}
                        href={`/profile/${game.slug}/sections/${section.id}`}
                        className="group relative flex items-center gap-6 p-8 bg-zinc-800/40 border-2 border-zinc-700/50 rounded-[2.5rem] hover:border-[#22c55e] transition-all duration-500 hover:shadow-2xl hover:shadow-[#22c55e]/10 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/0 to-[#22c55e]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10 w-20 h-20 rounded-2xl bg-black/60 flex items-center justify-center border border-zinc-700 group-hover:border-[#22c55e]/30 transition-colors">
                          {sectionIconUrl ? (
                            <div className="relative w-12 h-12">
                              <Image
                                src={sectionIconUrl}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                              />
                            </div>
                          ) : (
                            <span className="text-3xl font-bold text-zinc-600">?</span>
                          )}
                        </div>
                        
                        <div className="relative z-10 space-y-1">
                          <h3 className="font-black text-2xl uppercase italic tracking-tighter group-hover:text-[#22c55e] transition-colors">
                            {getTranslatedField(section.key, currentLang, game.default_lang)}
                          </h3>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                            {getTranslation('manageCollection', currentLang)}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-[3rem]">
                    <p className="text-zinc-600 font-bold uppercase tracking-widest italic">{getTranslation('noSections', currentLang)}</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </GameLocalizationProvider>
    </div>
  );
}
