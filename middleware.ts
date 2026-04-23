import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware handles route protection and role-based authorization.
 * Optimization: Uses Supabase app_metadata when available to avoid DB hits.
 */
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  const isAdminRoute = pathname.startsWith('/admin')
  const isProtected = isAdminRoute || pathname.startsWith('/profile')
  const isAuthPage = pathname.startsWith('/auth')

  // Fast path for public assets and routes
  if (!isProtected && !isAuthPage) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Authentication Check
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  // 2. Auth Page Redirection (logged in users shouldn't see signin)
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 3. Authorization Check (Admin only)
  if (user && isAdminRoute) {
    // Check JWT app_metadata first (zero-latency check)
    // To enable this, you must sync your 'profiles.role' to 'auth.users.app_metadata' via a Supabase trigger
    const role = user.app_metadata?.role

    if (role === 'admin') {
      return res
    }

    // Fallback: Check DB if metadata isn't synced yet
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
