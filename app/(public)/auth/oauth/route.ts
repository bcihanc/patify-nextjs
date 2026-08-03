import { NextResponse } from 'next/server'
import {createClient} from "@/lib/supabase/server";
// The client you created from the Server-Side Auth instructions

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const user = data.user
      if (user) {
        // Ensure a user_profiles row exists after first SSO login, so the gate
        // (lib/auth/gate.ts) routes brand-new users to /complete-profile. Leave
        // username unset/null — do NOT overwrite an existing row.
        // database.types.ts types username as non-null `string`, but the real
        // column is nullable for new SSO users (mobile does the same on first
        // login), so this needs a cast to get past strict TS; see the same
        // pattern in lib/profile/server.ts.
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({ id: user.id, username: null } as never, { onConflict: 'id', ignoreDuplicates: true })
        if (profileError) {
          console.error('user_profiles bootstrap error:', profileError.message)
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
