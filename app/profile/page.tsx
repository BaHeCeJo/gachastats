import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/app/components/Header";
import ProfileForm from "./ProfileForm";
import GSBackground from "@/app/components/GSBackground";
import { getTranslation } from "@/lib/localization-utils";
import { headers } from "next/headers";
import { GameLocalizationProvider, LocalizedString } from "@/lib/localization";
import GameCollectionManager from "@/app/components/GameCollectionManager";

type Profile = {
  id: string;
  created_at: string;
  role: string;
  nickname: string | null;
  avatar_url: string | null;
};

type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  cover_url: string | null;
};

export default async function ProfilePage() {
  const supabase = await createClient();

  // 1. Parallelize Auth and Initial Data
  const [userRes, allGamesRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("games").select("id, name, slug, cover_url")
  ]);

  const user = userRes.data.user;
  if (!user) redirect("/auth/signin");

  // 2. Fetch User Specific Data
  const [profileRes, userGamesRes] = await Promise.all([
    supabase.from("profiles").select("id, created_at, role, nickname, avatar_url").eq("id", user.id).single(),
    supabase.from("user_games").select("game_id").eq("user_id", user.id),
  ]);

  const profile = profileRes.data as Profile | null;
  const userGameIds = (userGamesRes.data || []).map((ug: { game_id: string }) => ug.game_id);
  const allGames = allGamesRes.data as Game[] | null;

  const headersList = await headers();
  const acceptLanguage = headersList.get('Accept-Language');
  const currentLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <GSBackground isHidden={false} />
      
      <GameLocalizationProvider gameDefaultLang="en" gameSupportedLanguages={['en']}>
        <Header breadcrumbs={[{ href: '/', label: getTranslation('home', currentLang) }, { href: '/profile', label: getTranslation('profile', currentLang) }]} />

        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="flex flex-col md:flex-row gap-16">
              {/* Left Column: Personal Info */}
              <div className="md:w-1/3 space-y-8">
                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[2.5rem] p-10 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#22c55e] mb-8">{getTranslation('personalInfo', currentLang)}</h2>
                  <ProfileForm initialProfile={profile || { nickname: null, avatar_url: null }} />
                </div>
              </div>

              {/* Right Column: Game Library */}
              <div className="flex-1 space-y-8">
                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[2.5rem] p-10 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#22c55e] mb-10">{getTranslation('myLibrary', currentLang)}</h2>
                  
                  <GameCollectionManager 
                    allGames={allGames || []} 
                    userGameIds={userGameIds} 
                    currentLang={currentLang} 
                  />
                </div>
              </div>
            </div>

          </div>
        </main>
      </GameLocalizationProvider>
    </div>
  );
}
