import { createClient } from "@/lib/supabase/server";
import { getPublicUrl } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import Header from "@/app/components/Header";
import ProfileForm from "./ProfileForm";
import GSBackground from "@/app/components/GSBackground";
import { getTranslation } from "@/lib/localization-utils";
import { cookies, headers } from "next/headers";
import { GameLocalizationProvider } from "@/lib/localization";
import GameCollectionManager from "@/app/components/GameCollectionManager";

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
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_games").select("game_id").eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  const userGameIds = (userGamesRes.data || []).map((ug: any) => ug.game_id);
  const allGames = allGamesRes.data || [];

  // --- Language Detection ---
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = cookieStore.get('user_lang')?.value;
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  const currentLang = userLang || browserLang;

  return (
    <div className="relative flex flex-col min-h-screen bg-black font-sans text-white overflow-x-hidden">
      <GameLocalizationProvider gameDefaultLang={currentLang} gameSupportedLanguages={[currentLang]}>
        <GSBackground />
        
        <Header breadcrumbs={[{ href: "/profile", label: getTranslation('profile', currentLang) }]} />

        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto space-y-16">
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="space-y-4 text-center md:text-left">
                <h1 className="text-7xl font-black italic uppercase tracking-tighter text-[#22c55e] transition-all hover:scale-[1.02] cursor-default">
                  {profile?.nickname || getTranslation('defaultNickname', currentLang)}
                </h1>
                {/* Email removed for privacy */}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column: Settings */}
              <div className="lg:col-span-1 space-y-12">
                <section className="space-y-8">
                  <h2 className="text-2xl font-black italic uppercase tracking-widest flex items-center gap-4">
                    <span className="w-8 h-1 bg-[#22c55e]" />
                    {getTranslation('profile', currentLang)}
                  </h2>
                  <ProfileForm initialProfile={profile} />
                </section>
              </div>

              {/* Right Column: Game Collection */}
              <div className="lg:col-span-2 space-y-8">
                <h2 className="text-2xl font-black italic uppercase tracking-widest flex items-center gap-4">
                  <span className="w-8 h-1 bg-[#22c55e]" />
                  {getTranslation('myCollection', currentLang)}
                </h2>
                
                <div className="bg-zinc-900/30 border border-zinc-800 p-10 rounded-[3rem] space-y-8 shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                    {getTranslation('games', currentLang)}
                  </p>
                  <GameCollectionManager 
                    allGames={allGames} 
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
