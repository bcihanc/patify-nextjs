"use server";

import { redirect } from "next/navigation";

const EDGE_URL =
  "https://uynwrqccvfcwunrzoxva.supabase.co/functions/v1/email-unsubscribe";

/// Onay düğmesi: edge function'a sunucudan POST atar (RFC 8058 ile aynı yol),
/// sonucu `r` parametresiyle sayfaya taşır. İmzayı edge doğrular; burada sır yok.
export async function unsubscribeAction(formData: FormData) {
  const u = String(formData.get("u") ?? "");
  const t = String(formData.get("t") ?? "");
  let r: "ok" | "invalid" | "error" = "error";
  if (u && t) {
    try {
      const res = await fetch(
        `${EDGE_URL}?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "",
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        },
      );
      r = res.status === 200 ? "ok" : res.status === 400 ? "invalid" : "error";
    } catch {
      r = "error";
    }
  } else {
    r = "invalid";
  }
  redirect(
    `/eposta-cikis?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}&r=${r}`,
  );
}
