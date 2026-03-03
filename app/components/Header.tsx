import Link from "next/link";
import Breadcrumbs from "./Breadcrumbs";
import HeaderClient from "./HeaderClient";
import GSLogo from "./GSLogo";
import { createClient } from "@/lib/supabase/server";

export default async function Header({ breadcrumbs }: { breadcrumbs?: { href: string; label: string }[] }) {
  const sPathData = "M 250 200 H 350 H 500 Q 540 200 540 165 V 155 Q 540 130 500 130 H 420 Q 380 130 380 105 V 95 Q 380 60 420 60 H 540";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full px-8 py-4 flex items-center justify-between bg-zinc-50/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-all">
      <div className="flex items-center gap-8">
        <Link href="/" className="group flex items-center gap-3">
          <GSLogo className="w-10 h-10 transition-transform group-hover:scale-110" sPathData={sPathData} />
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-black italic tracking-tighter text-black dark:text-white uppercase transition-colors group-hover:text-[#22c55e]">
              Gacha
            </span>
            <span className="text-[10px] font-black italic tracking-[0.2em] text-[#22c55e] uppercase -mt-1">
              Stats
            </span>
          </div>
        </Link>
        <div className="hidden md:block h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div className="relative z-[60]">
        <HeaderClient isAdmin={isAdmin} isLoggedIn={!!user} />
      </div>
    </header>
  );
}
