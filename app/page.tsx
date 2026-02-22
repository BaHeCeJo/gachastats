import { createClient } from "@/lib/supabase/server";
import Header from "./components/Header";
import HomeContent from "./components/HomeContent";

export default async function Home() {
  const supabase = await createClient();

  const { data: games, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("HOME PAGE GAMES ERROR:", error);
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <Header />

      {/* HomeContent is a Client Component that handles Intro, Background, and Grid interactions */}
      <HomeContent 
        games={games || []} 
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} 
      />

      <footer className="w-full text-center py-10 bg-white/30 dark:bg-black/30 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 z-10">
        <p className="text-zinc-500 dark:text-zinc-500 text-sm font-medium tracking-widest uppercase">
          &copy; {new Date().getFullYear()} GachaStats / GS
        </p>
      </footer>
    </div>
  );
}
