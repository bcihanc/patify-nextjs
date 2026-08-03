import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import HashRecoveryHandler from "./hash-recovery-handler";

/// Universal-link landing page for the Supabase password-recovery flow used
/// by the Patify mobile apps (`redirectTo: https://patify.net/reset-password`).
///
/// Most visitors will not see this page at all — on iOS/Android the
/// Universal Link / App Link intercepts the URL and opens the native app,
/// which handles the recovery token internally. This page is the **fallback
/// for desktop browsers, devices without the app installed, and Safari
/// transitions where the Universal Link does not fire**.
///
/// Two recovery URL shapes have to be handled here:
///
/// 1. **PKCE flow** (default for newer Supabase projects):
///    `https://patify.net/reset-password?code=<one-time-code>` — the code
///    is in the query string and can be exchanged for a session on the
///    server. We do that here and forward to `/home/reset-password`, which
///    owns the actual new-password form.
///
/// 2. **Implicit flow** (legacy / projects that haven't migrated to PKCE):
///    `https://patify.net/reset-password#access_token=...&refresh_token=...&type=recovery`.
///    Hash fragments are not sent to the server, so a client component
///    ([HashRecoveryHandler]) does `supabase.auth.setSession(...)` and
///    forwards to `/home/reset-password` from the browser.
///
/// Any other shape — missing code/token, expired link, Supabase error —
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

  // No code in the URL — could be the implicit flow with a hash fragment,
  // which only the browser can read. Defer to the client handler.
  return <HashRecoveryHandler />;
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
