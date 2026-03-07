import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * OPTIMIZED MIDDLEWARE
 * 1. Uses an exclusive matcher to avoid running on assets/images.
 * 2. Immediately returns for public routes to avoid object overhead.
 * 3. Only performs heavy auth logic for /admin, /profile, and /auth.
 */
export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // 1. FAST PATH: Identify routes that REQUIRE auth logic
  // Immediately return for public routes to avoid object overhead and cookie parsing
  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/profile')
  const isAuthPage = pathname.startsWith('/auth')

  if (!isProtected && !isAuthPage) {
    return NextResponse.next()
  }

  // 2. AUTH LOGIC: Only execute for specific routes
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

  // This is the "expensive" part (network call to Supabase)
  const { data: { user } } = await supabase.auth.getUser()

  // Authorization Redirects
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

/**
 * EXCLUSIVE MATCHER
 * We only run middleware on paths that could possibly be pages.
 * We explicitly exclude everything that looks like a static asset.
 */
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
