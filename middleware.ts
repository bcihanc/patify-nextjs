import { type NextRequest } from 'next/server'
import {updateSession} from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // updateSession also forwards the x-pathname request header and runs the
  // coarse authed-route guard (see lib/supabase/middleware.ts) — it needs the
  // same Supabase client/user lookup as the cookie refresh, so both live there
  // instead of a second getUser() call here.
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
