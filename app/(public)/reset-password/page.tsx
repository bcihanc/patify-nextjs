import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/// Universal-link landing page for the Supabase password-recovery flow used
/// by the Patify mobile apps (`redirectTo: https://patify.net/reset-password`).
///
/// Most visitors will not see this page at all — on iOS/Android the
/// Universal Link / App Link intercepts the URL and opens the native app,
/// which handles the recovery token internally. This page is the **fallback
/// for desktop browsers, devices without the app installed, and Safari
/// transitions where the Universal Link does not fire**.
///
/// Only the PKCE shape is accepted:
/// `https://patify.net/reset-password?code=<one-time-code>`. The code is
/// exchanged for a session on the server (it needs the code verifier stored
/// by the browser that requested the recovery), then we forward to
/// `/home/reset-password`, which owns the actual new-password form.
///
/// Implicit-flow links (`#access_token=...&refresh_token=...`) are never
/// installed as a session: the fragment is attacker-writable, so honouring it
/// lets any link swap the visitor's session. Web and mobile both send PKCE
/// links (`@supabase/ssr` and `supabase_flutter` default to PKCE).
///
/// Any other shape — missing code, expired link, Supabase error —
/// falls through to an inline "link is invalid" message with a link back
/// to `/forgot-password` so the user can request a fresh email.
export default async function ResetPasswordEntryPage(props: {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
}) {
  const params = await props.searchParams;

  // Supabase forwards verification errors as `?error=...&error_description=...`
  // when the recovery token is already used or expired. Surface those
  // first so we don't try to exchange a code that isn't there.
  if (params.error || params.error_description) {
    return (
      <InvalidLinkMessage
        detail={params.error_description ?? params.error ?? null}
      />
    );
  }

  if (params.code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      return <InvalidLinkMessage detail={error.message} />;
    }
    // Session is now in cookies; the form lives at /home/reset-password.
    redirect("/home/reset-password");
  }

  return <InvalidLinkMessage detail={null} />;
}

function InvalidLinkMessage({ detail }: { detail: string | null }) {
  return (
    <div className="flex flex-col w-full max-w-md p-4 gap-4 mx-auto mt-12">
      <h1 className="text-2xl font-medium">Bağlantı Geçersiz</h1>
      <p className="text-sm text-foreground/60">
        Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş olabilir.
        Lütfen yeni bir sıfırlama bağlantısı isteyin.
      </p>
      {detail ? (
        <p className="text-xs text-foreground/40 break-words">
          Detay: {detail}
        </p>
      ) : null}
      <Link
        href="/forgot-password"
        className="text-primary underline text-sm"
      >
        Yeniden şifre sıfırla
      </Link>
    </div>
  );
}
