import Image from "next/image"
import HeaderClient from "./HeaderClient"
import { createClient } from "@/lib/supabase/server"
import Breadcrumbs from "./Breadcrumbs"; // Import Breadcrumbs component

type Crumb = {
  href: string;
  label: string;
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
    <header className="w-full px-8 py-4 bg-white dark:bg-black shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/next.svg"
            alt="Logo"
            width={40}
            height={40}
            className="dark:invert"
          />
          <span className="text-xl font-bold text-black dark:text-zinc-50">
            My Homepage
          </span>
        </div>

        <HeaderClient isAdmin={isAdmin} />
      </div>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mt-2">
          <Breadcrumbs crumbs={breadcrumbs} />
        </div>
      )}
    </header>
  )
}
