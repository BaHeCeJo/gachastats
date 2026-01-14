'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

export default function HeaderClient({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "/"

  // Build admin link:
  // - If at root "/" => "/admin"
  // - If already under "/admin" => create public counterpart (Exit Admin)
  // - Else => "/admin" + current pathname (e.g. "/mygame" -> "/admin/mygame")
  const isAdminRoute = pathname.startsWith("/admin")

  const adminHref = (() => {
    if (pathname === "/") return "/admin"
    if (isAdminRoute) return pathname // already admin
    // ensure single leading slash
    return `/admin${pathname}`
  })()

  // When inside /admin/* we want a link back to the public route:
  const publicHref = (() => {
    if (!isAdminRoute) return pathname
    const publicPath = pathname.replace(/^\/admin/, "") || "/"
    return publicPath
  })()

  return (
    <nav className="flex gap-6 items-center">
      <Link href="/" className="font-medium hover:underline">
        Home
      </Link>

      {/* Admin button appears only if server told us the user is admin */}
      {isAdmin && (
        <>
          {isAdminRoute ? (
            <Link
              href={publicHref}
              className="ml-2 px-3 py-1 rounded-md border font-medium hover:bg-zinc-100"
            >
              Exit Admin
            </Link>
          ) : (
            <Link
              href={adminHref}
              className="ml-2 px-3 py-1 rounded-md bg-blue-600 text-white font-medium hover:opacity-90"
            >
              Admin
            </Link>
          )}
        </>
      )}
    </nav>
  )
}
