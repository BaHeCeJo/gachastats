'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"
import { signOut } from "@/app/auth/signout/action"
import { useLocalizationParams } from "@/lib/localization"
import { languages } from "@/lib/constants/languages"

export default function HeaderClient({ 
  isAdmin, 
  isLoggedIn 
}: { 
  isAdmin: boolean
  isLoggedIn: boolean
}) {
  const pathname = usePathname() ?? "/"
  const { 
    adminSelectedLang, 
    setAdminSelectedLang, 
    gameSupportedLanguages, 
    currentLang,
    t,
    userSelectedLang,
    setUserSelectedLang
  } = useLocalizationParams();

  const isAdminRoute = pathname.startsWith("/admin")

  const adminHref = (() => {
    if (pathname === "/") return "/admin"
    if (isAdminRoute) return pathname 
    return `/admin${pathname}`
  })()

  const publicHref = (() => {
    if (!isAdminRoute) return pathname
    const publicPath = pathname.replace(/^\/admin/, "") || "/"
    return publicPath
  })()

  return (
    <nav className="flex gap-6 items-center">
      {/* Public Language Switcher - Shows on public pages when a game is active */}
      {!isAdminRoute && gameSupportedLanguages && gameSupportedLanguages.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-zinc-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <select 
            className="bg-transparent text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-4 text-black dark:text-white"
            value={userSelectedLang || ""}
            onChange={(e) => setUserSelectedLang(e.target.value || null)}
          >
            <option value="">{t('browserDefault')} ({currentLang.toUpperCase()})</option>
            {gameSupportedLanguages.map((langCode: string) => {
              const langInfo = languages.find(l => l.code === langCode);
              return (
                <option key={langCode} value={langCode}>
                  {langInfo ? langInfo.native_name : langCode.toUpperCase()}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {isAdmin && isAdminRoute && gameSupportedLanguages && gameSupportedLanguages.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-zinc-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <select 
            className="bg-transparent text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-4"
            value={adminSelectedLang || ""}
            onChange={(e) => setAdminSelectedLang(e.target.value || null)}
          >
            <option value="">{t('browserDefault')} ({currentLang.toUpperCase()})</option>
            {gameSupportedLanguages.map((langCode: string) => {
              const langInfo = languages.find(l => l.code === langCode);
              return (
                <option key={langCode} value={langCode}>
                  {langInfo ? langInfo.native_name : langCode.toUpperCase()}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {!isLoggedIn ? (
        <Link
          href="/auth/signin"
          className="px-4 py-2 rounded-md bg-[#22c55e] text-black font-bold hover:bg-[#1da34a] transition relative z-[60]"
        >
          {t('signIn')}
        </Link>
      ) : (
        <div className="flex items-center gap-4">
          {/* Admin button appears only if server told us the user is admin */}
          {isAdmin && (
            <>
              {isAdminRoute ? (
                <Link
                  href={publicHref}
                  className="px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 text-black dark:text-zinc-50 transition"
                >
                  {t('exitAdmin')}
                </Link>
              ) : (
                <Link
                  href={adminHref}
                  className="px-3 py-1 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                >
                  {t('admin')}
                </Link>
              )}
            </>
          )}
          
          <Link
            href="/profile"
            className="text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-[#22c55e] transition flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {t('profile')}
          </Link>
          
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition"
            >
              {t('signOut')}
            </button>
          </form>
        </div>
      )}
    </nav>
  )
}
