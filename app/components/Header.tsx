import Image from "next/image"
import HeaderClient from "./HeaderClient"
import { createClient } from "@/lib/supabase/server"

export default async function Header() {
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

    // If error, keep isAdmin = false; otherwise check role
    if (!error && profile?.role === "admin") {
      isAdmin = true
    }
  }

  // Render header skeleton + client part for dynamic path handling
  return (
    <header className="w-full flex items-center justify-between px-8 py-4 bg-white dark:bg-black shadow-sm">
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

      {/* Client component handles current pathname & admin link */}
      <HeaderClient isAdmin={isAdmin} />
    </header>
  )
}
