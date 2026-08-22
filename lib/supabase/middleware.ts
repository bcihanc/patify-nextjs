import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Route prefixes that live under the authenticated app shell (app/(app)/*).
// The layout gate (app/(app)/layout.tsx) is the authority; this is only the
// early coarse pass so an unauthenticated request never renders app UI.
const AUTHED_PREFIXES = ['/chats', '/profile', '/notifications', '/complete-profile', '/accept-consent', '/admin']

// Public exceptions: /lost-found/item/* is the crawlable public listing
// (app/(public)/lost-found/item/[id]); /profile/user/* is the guest-viewable
// public profile — neither is gated.
function isAuthedPath(pathname: string): boolean {
  if (pathname.startsWith('/lost-found/item')) return false
  if (pathname.startsWith('/profile/user/')) return false
  return AUTHED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Forward the pathname as a REQUEST header. Next.js 15 server components
  // can't read the current pathname natively, and a RESPONSE header set here
  // would not be visible to headers() downstream — it has to be a request
  // header so app/(app)/layout.tsx can read it via headers().get('x-pathname').
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirects below carry over any cookies refreshed by getUser() above, so an
  // authenticated user whose session token was just refreshed doesn't lose the
  // new cookie on a redirect response (session shear).
  function redirectTo(redirectPathname: string) {
    const url = request.nextUrl.clone()
    url.pathname = redirectPathname
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  if (!user && isAuthedPath(pathname)) {
    // Coarse guard only — the (app) layout is the authoritative gate.
    return redirectTo('/auth/login')
  }

  if (pathname === '/home') {
    // /home was the old post-login target; /lost-found is the new one.
    // Unauthenticated visits bounce here too, then get caught by the
    // isAuthedPath check above on the follow-up request (/lost-found is an
    // authed prefix), landing on /auth/login.
    return redirectTo('/lost-found')
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
