import { createClient } from "@/lib/supabase/server";
import Header from "./components/Header";
import HomeContent from "./components/HomeContent";
import { GameLocalizationProvider } from "@/lib/localization"; // Import GameLocalizationProvider
import { headers, cookies } from "next/headers";
import { getTranslation } from "@/lib/localization-utils";

export default async function Home() {
  const supabase = await createClient();

  // Fetch default_lang and supported_languages as well
  const { data: games, error } = await supabase
    .from("games")
    .select("id, name, slug, description, cover_url, default_lang, supported_languages")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("HOME PAGE GAMES ERROR:", error.message, error.details, error.hint);
  }

  // Determine a default game or use the first one to pass its language settings
  // This is a simplification; a real app might use a global setting or context.
  const firstGame = games && games.length > 0 ? games[0] : null;
  const gameDefaultLang = firstGame?.default_lang || 'en';
  const gameSupportedLanguages = firstGame?.supported_languages || ['en'];

  // --- Language Detection ---
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = cookieStore.get('user_lang')?.value;
  
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  const currentLang = userLang || browserLang;

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <Header />
      <GameLocalizationProvider
        gameDefaultLang={gameDefaultLang}
        gameSupportedLanguages={gameSupportedLanguages}
      >
        {/* HomeContent is a Client Component that handles Intro, Background, and Grid interactions */}
        <HomeContent
          games={games || []}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
        />
      </GameLocalizationProvider>

      <footer className="w-full text-center py-10 bg-white/30 dark:bg-black/30 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 z-10">
        <p className="text-zinc-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase">
          &copy; {new Date().getFullYear()} {getTranslation('footerText', currentLang)}
        </p>
      </footer>
    </div>
  );
}
