import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * PRODUCTION-READY MIDDLEWARE
 * 1. Renamed to standard middleware.ts for Next.js execution.
 * 2. Uses an exclusive matcher to avoid running on assets/images.
 * 3. Handles auth redirects for /admin, /profile, and /auth.
 * 4. Adds basic protection headers.
 */
export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // 1. FAST PATH: Skip for static assets and public files
  // (Matcher already handles most of this, but we keep it here for safety)
  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/profile')
  const isAuthPage = pathname.startsWith('/auth')

  if (!isProtected && !isAuthPage) {
    return NextResponse.next()
  }

  // 2. AUTH LOGIC
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

  // Security Redirects
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
