import Header from "./components/Header";
import HomeContent from "./components/HomeContent";
import { GameLocalizationProvider } from "@/lib/localization";
import { getTranslation } from "@/lib/localization-utils";
import { getGames } from "@/lib/supabase/queries";

// Enable ISR
export const revalidate = 3600;

export default async function Home() {
  const { data: games, error } = await getGames();

  if (error) {
    console.error("HOME PAGE GAMES ERROR:", error.message);
  }

  const firstGame = games && games.length > 0 ? games[0] : null;
  const gameDefaultLang = firstGame?.default_lang || 'en';
  const gameSupportedLanguages = firstGame?.supported_languages || ['en'];

  // Static fallback language
  const currentLang = 'en';

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <Header />
      <GameLocalizationProvider
        gameDefaultLang={gameDefaultLang}
        gameSupportedLanguages={gameSupportedLanguages}
      >
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
