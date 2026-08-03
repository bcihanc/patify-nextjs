"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/// Browser-only handler for the Supabase implicit recovery flow, where the
/// access/refresh tokens arrive in the URL hash fragment instead of the
/// query string. Hash fragments aren't sent to the server, so this work
/// can't live in the parent server component.
///
/// On mount: parse `window.location.hash`, call `setSession(...)` so the
/// session lands in cookies (the `@supabase/ssr` browser client wires
/// that up for us), then redirect to `/home/reset-password`, which owns
/// the actual new-password form.
export default function HashRecoveryHandler() {
  const router = useRouter();
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const rawHash = window.location.hash;
      if (!rawHash || rawHash.length <= 1) {
        // Reached this page with neither query code nor hash fragment —
        // the link is malformed or someone navigated here directly.
        if (!cancelled) setHasError(true);
        return;
      }

      const params = new URLSearchParams(rawHash.slice(1));

      // Supabase puts implicit-flow errors here too (e.g. expired link
      // before the user got to verify). Surface them instead of a
      // generic message.
      const hashError = params.get("error_description") ?? params.get("error");
      if (hashError) {
        if (!cancelled) {
          setErrorDetail(hashError);
          setHasError(true);
        }
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) {
        if (!cancelled) setHasError(true);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) return;

      if (error) {
        setErrorDetail(error.message);
        setHasError(true);
        return;
      }

      router.replace("/home/reset-password");
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (hasError) {
    return (
      <div className="flex flex-col w-full max-w-md p-4 gap-4 mx-auto mt-12">
        <h1 className="text-2xl font-medium">Bağlantı Geçersiz</h1>
        <p className="text-sm text-foreground/60">
          Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş olabilir.
          Lütfen yeni bir sıfırlama bağlantısı isteyin.
        </p>
        {errorDetail ? (
          <p className="text-xs text-foreground/40 break-words">
            Detay: {errorDetail}
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

  return (
    <div className="flex flex-col w-full max-w-md p-4 gap-4 mx-auto mt-12">
      <p className="text-sm text-foreground/60">Yönlendiriliyor…</p>
    </div>
  );
}
