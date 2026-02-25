import Image from "next/image"
import Link from "next/link"
import HeaderClient from "./HeaderClient"
import { createClient } from "@/lib/supabase/server"
import Breadcrumbs from "./Breadcrumbs"; // Import Breadcrumbs component
import { LocalizedString } from "@/lib/localization-utils"; // Import LocalizedString

type Crumb = {
  href: string;
  label: string | LocalizedString; // Label can now be a LocalizedString
};

export default async function Header({ breadcrumbs }: { breadcrumbs?: Crumb[] }) {
  // Server-side: retrieve user and profile role
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false

  if (user) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!error && profile?.role === "admin") {
      isAdmin = true
    }
  }

  return (
    <header className="w-full px-8 py-4 bg-white dark:bg-black shadow-sm z-50 relative border-b border-zinc-100 dark:border-zinc-900">
      <div className="flex items-center justify-between w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <svg
            viewBox="0 0 800 400"
            className="w-16 h-8 fill-none stroke-[40] overflow-visible"
            strokeLinejoin="miter"
          >
            <defs>
              <marker
                id="arrow-triangle-header"
                viewBox="0 0 10 10"
                refX="0"
                refY="5"
                markerUnits="strokeWidth"
                markerWidth="1"
                markerHeight="1"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 Z" fill="#22c55e" />
              </marker>
            </defs>
            {/* The "G" Body - Stops at y=240 to account for the stroke extension and avoid overlap */}
            <path
              d="M 350 100 H 250 A 100 100 0 1 0 250 300 H 350 V 240"
              className="stroke-black dark:stroke-white transition-colors"
              strokeLinecap="square"
            />
            {/* The Crossbar + "S" */}
            <path
              d="M 250 200 H 350 H 500 Q 540 200 540 165 V 155 Q 540 130 500 130 H 420 Q 380 130 380 105 V 95 Q 380 60 420 60 H 540"
              className="stroke-[#22c55e]"
              strokeLinecap="butt"
              markerEnd="url(#arrow-triangle-header)"
            />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black text-black dark:text-zinc-50 tracking-tighter">GACHA</span>
            <span className="text-[10px] font-bold text-green-600 tracking-[0.2em] uppercase">Stats</span>
          </div>
        </Link>

        <HeaderClient isAdmin={isAdmin} isLoggedIn={!!user} />
      </div>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mt-2">
          <Breadcrumbs crumbs={breadcrumbs} />
        </div>
      )}
    </header>
  )
}
