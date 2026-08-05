"use server";

import {createClient} from "@/lib/supabase/server";
import {encodedRedirect} from "@/utils/utils";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {isAtLeastAge, MIN_SIGNUP_AGE, PP_VERSION, TOS_VERSION} from "@/lib/consent";
import {safeNextPath} from "@/lib/auth/next-path";
import {authErrorToTurkish} from "@/lib/auth/error-messages";


export const signUpAction = async (formData: FormData) => {
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    const birthDate = formData.get("birthDate")?.toString();
    const consent = formData.get("consent")?.toString();
    const supabase = await createClient();
    const origin = (await headers()).get("origin");

    if (!email || !password) {
        return encodedRedirect(
            "error",
            "/sign-up",
            "Email and password are required"
        );
    }

    // Age gate + ToS/PP consent gate (mirrors mobile's email-signup gate).
    // Consent itself is NOT written to the DB here — no session exists yet
    // pre-verification; it's re-collected and persisted at /accept-consent.
    if (!birthDate) {
        return encodedRedirect("error", "/sign-up", "Doğum tarihinizi girin.");
    }
    if (!isAtLeastAge(birthDate, MIN_SIGNUP_AGE)) {
        return encodedRedirect(
            "error",
            "/sign-up",
            `Hesap açmak için en az ${MIN_SIGNUP_AGE} yaşında olmalısınız.`
        );
    }
    if (consent !== "on") {
        return encodedRedirect(
            "error",
            "/sign-up",
            "Kullanım koşullarını ve gizlilik politikasını kabul etmelisiniz."
        );
    }

    const {error} = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        console.error(error.code + " " + error.message);
        return encodedRedirect("error", "/sign-up", authErrorToTurkish(error.message));
    } else {
        return encodedRedirect(
            "success",
            "/sign-up",
            "Thanks for signing up! Please check your email for a verification link."
        );
    }
};

export const signInAction = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const next = safeNextPath(formData.get("next") as string | null);
    const supabase = await createClient();

    const {error} = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // Preserve `next` on a failed attempt (e.g. wrong password) so a
        // retry that succeeds still lands where the guest was headed —
        // encodedRedirect() can't carry a second query param, so this
        // builds the same `error=` shape by hand.
        const suffix = next ? `&next=${encodeURIComponent(next)}` : '';
        return redirect(`/auth/login?error=${encodeURIComponent(authErrorToTurkish(error.message))}${suffix}`);
    }

    return redirect(next ?? "/lost-found");
};

export const forgotPasswordAction = async (formData: FormData) => {
    const email = formData.get("email")?.toString();
    const supabase = await createClient();
    const origin = (await headers()).get("origin");
    const callbackUrl = formData.get("callbackUrl")?.toString();

    if (!email) {
        return encodedRedirect("error", "/forgot-password", "E-posta adresi gerekli.");
    }

    const {error} = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?redirect_to=/home/reset-password`,
    });

    if (error) {
        console.error(error.message);
        return encodedRedirect(
            "error",
            "/forgot-password",
            authErrorToTurkish(error.message)
        );
    }

    if (callbackUrl) {
        return redirect(callbackUrl);
    }

    return encodedRedirect(
        "success",
        "/forgot-password",
        "Şifre sıfırlama bağlantısı için e-postanı kontrol et."
    );
};

export const resetPasswordAction = async (formData: FormData) => {
    const supabase = await createClient();

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || !confirmPassword) {
        return encodedRedirect(
            "error",
            "/home/reset-password",
            "Şifre ve şifre tekrarı gerekli."
        );
    }

    if (password !== confirmPassword) {
        return encodedRedirect("error", "/home/reset-password", "Şifreler eşleşmiyor.");
    }

    const {error} = await supabase.auth.updateUser({
        password: password,
    });

    if (error) {
        return encodedRedirect("error", "/home/reset-password", authErrorToTurkish(error.message));
    }

    return encodedRedirect("success", "/home/reset-password", "Şifren güncellendi.");
};

// /profile/change-password. Only applies to email/password accounts — the
// page itself hides the form for Google/Apple sign-in (no Supabase-managed
// password to change), but the action re-checks the provider too, since a
// raw POST to a server action bypasses whatever the page rendered.
export const changePasswordAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return redirect("/auth/login");
  }

  if (user.app_metadata?.provider !== "email") {
    return encodedRedirect(
      "error",
      "/profile/change-password",
      "Şifre değiştirme yalnızca e-posta ile giriş yapan hesaplar içindir."
    );
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/profile/change-password",
      "Tüm alanları doldurun."
    );
  }

  if (newPassword.length < 6) {
    return encodedRedirect(
      "error",
      "/profile/change-password",
      "Yeni şifre en az 6 karakter olmalı."
    );
  }

  if (newPassword !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/profile/change-password",
      "Yeni şifreler eşleşmiyor."
    );
  }

  // Re-authenticate with the current password before allowing a change —
  // supabase.auth.updateUser() alone never asks the caller to prove they
  // know the current password.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    return encodedRedirect(
      "error",
      "/profile/change-password",
      "Mevcut şifre yanlış."
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    console.error("changePasswordAction:", updateError.message);
    return encodedRedirect(
      "error",
      "/profile/change-password",
      "Şifre güncellenemedi, tekrar dene."
    );
  }

  return encodedRedirect("success", "/profile/change-password", "Şifre güncellendi.");
};

// /profile/blocked "Engeli kaldır" — deletes one row scoped to the session
// user_id (never client-supplied), matching acceptConsentAction's
// defense-in-depth even though RLS should also enforce this.
export const unblockUserAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/auth/login");
  }

  const blockedUserId = formData.get("blockedUserId") as string;
  if (!blockedUserId) {
    return encodedRedirect("error", "/profile/blocked", "Geçersiz istek.");
  }

  const { error } = await supabase
    .from("user_blockings")
    .delete()
    .eq("user_id", user.id)
    .eq("blocked_user_id", blockedUserId);

  if (error) {
    console.error("unblockUserAction:", error.message);
    return encodedRedirect("error", "/profile/blocked", "Engel kaldırılamadı, tekrar dene.");
  }

  return encodedRedirect("success", "/profile/blocked", "Engel kaldırıldı.");
};

// /accept-consent wall: (re)writes the current user's consent record.
// Birth date + ToS/PP acceptance are re-validated here server-side — the
// client-side `required`/date-input constraints are UX only, not trust.
export const acceptConsentAction = async (formData: FormData) => {
    const supabase = await createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if (!user) {
        return redirect("/auth/login");
    }

    const birthDate = formData.get("birthDate")?.toString();
    const consent = formData.get("consent")?.toString();
    const analyticsConsent = formData.get("analyticsConsent")?.toString();

    if (!birthDate) {
        return encodedRedirect("error", "/accept-consent", "Doğum tarihinizi girin.");
    }
    if (!isAtLeastAge(birthDate, MIN_SIGNUP_AGE)) {
        return encodedRedirect(
            "error",
            "/accept-consent",
            `Hesabına devam edebilmek için en az ${MIN_SIGNUP_AGE} yaşında olmalısınız.`
        );
    }
    if (consent !== "on") {
        return encodedRedirect(
            "error",
            "/accept-consent",
            "Kullanım koşullarını ve gizlilik politikasını kabul etmelisiniz."
        );
    }

    // user_id comes from the session, never from client input — RLS also
    // restricts user_private writes to user_id = auth.uid(), but we don't
    // rely on that alone.
    const {error} = await supabase.from("user_private").upsert(
        {
            user_id: user.id,
            consent_accepted_at: new Date().toISOString(),
            tos_version: TOS_VERSION,
            pp_version: PP_VERSION,
            birth_date: birthDate,
        },
        {onConflict: "user_id"}
    );

    if (error) {
        console.error(error.message);
        return encodedRedirect("error", "/accept-consent", "Kaydedilemedi, tekrar dene.");
    }

    if (analyticsConsent === "on") {
        // Best-effort: analytics consent is optional metadata, so a failure
        // here must not block the (already-persisted) ToS/PP acceptance.
        // Awaited (not truly detached) so it actually runs before the
        // function returns/redirects in a serverless runtime.
        const {error: analyticsError} = await supabase
            .rpc("set_analytics_consent", {enabled: true})
            .abortSignal(AbortSignal.timeout(3000));
        if (analyticsError) {
            console.error("set_analytics_consent failed:", analyticsError.message);
        }
    }

    return redirect("/lost-found");
};

export const signOutAction = async () => {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return redirect("/auth/login");
};

// /profile/delete "Hesabımı kalıcı olarak sil". The confirm-phrase gate
// lives client-side (delete-account-form.tsx) — it's a "did you mean it" UX
// gate, not a security boundary, since an authenticated user is always
// allowed to delete their own account. The actual security-relevant gate is
// reauth: email/password accounts must re-prove the current password here
// (mirrors changePasswordAction) before anything is destroyed, since a
// merely-active session shouldn't be enough to irreversibly delete. Google/
// Apple accounts have no Supabase-managed password to re-check — full
// mid-flow OAuth reauth is impractical on the web (would mean bouncing the
// user off-site mid-deletion), so for SSO the confirm-phrase + active
// session is the gate. This is a deliberate deviation from mobile, which
// forces a fresh native Google/Apple sign-in before deleting.
export const deleteAccountAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/auth/login");
  }

  if (user.app_metadata?.provider === "email") {
    if (!user.email) {
      return encodedRedirect("error", "/profile/delete", "Hesap silinemedi, tekrar dene.");
    }

    const password = formData.get("password") as string;
    if (!password) {
      return encodedRedirect("error", "/profile/delete", "Şifrenizi girin.");
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (reauthError) {
      return encodedRedirect("error", "/profile/delete", "Mevcut şifre yanlış.");
    }
  }

  const { error } = await supabase.functions.invoke("delete-authenticated-user", {
    method: "DELETE",
  });
  if (error) {
    console.error("deleteAccountAction:", error.message);
    return encodedRedirect("error", "/profile/delete", "Hesap silinemedi, tekrar dene.");
  }

  await supabase.auth.signOut();

  return redirect("/auth/login");
};

// /profile/delete "Verilerimi indir" (KVKK m.11 / GDPR Art.20 data
// portability). Returns the edge function's JSON payload as a
// pretty-printed string for the client to turn into a downloaded file —
// mirrors mobile's AuthRepo.exportUserData re-encoding step. user_id is
// resolved from the session inside the edge function itself (never passed
// from here), same defense-in-depth as the rest of this file.
export const exportDataAction = async (): Promise<
  { error: string } | { success: true; json: string }
> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Oturum bulunamadı, tekrar giriş yap." };
  }

  const { data, error } = await supabase.functions.invoke("export-user-data", {
    method: "POST",
  });
  if (error) {
    console.error("exportDataAction:", error.message);
    return { error: "Veriler indirilemedi, tekrar dene." };
  }

  return { success: true, json: JSON.stringify(data, null, 2) };
};

// /profile/edit save. Called directly from the client form (not a plain
// <form action>, since avatar upload — client-side canvas compression —
// must happen before this runs and its result feeds `profilePhoto` below;
// see components/login-form.tsx for the same "call a server action
// directly, await its result" pattern already used in this repo).
//
// Writes are split exactly like mobile's user_profile_repo: `phone` +
// home-location go to `user_private` (owner-only), everything else to
// `user_profiles`. `user.id` comes from the session, never from the
// argument — same RLS-defense-in-depth as acceptConsentAction.
export type UpdateProfileInput = {
  bio: string;
  xUrl: string;
  instagramUrl: string;
  telegramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  phone: string;
  profilePhoto: string | null; // newly uploaded avatar path; null = unchanged
  homeCity: string | null;
  homeDistrict: string | null;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const updateProfileAction = async (
    input: UpdateProfileInput
): Promise<{ error: string } | { success: true }> => {
    const supabase = await createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if (!user) {
        return {error: "Oturum bulunamadı, tekrar giriş yap."};
    }

    // Only {user_id, phone, home_city, home_district} are sent, so this
    // upsert's ON CONFLICT DO UPDATE never touches consent_accepted_at /
    // tos_version / pp_version / birth_date (same guarantee as
    // acceptConsentAction's upsert, which is the mirror-image split).
    const {error: privateError} = await supabase.from("user_private").upsert(
        {
            user_id: user.id,
            phone: emptyToNull(input.phone),
            home_city: input.homeCity,
            home_district: input.homeDistrict,
        },
        {onConflict: "user_id"}
    );
    if (privateError) {
        console.error("updateProfileAction (user_private):", privateError.message);
        return {error: "Kaydedilemedi, tekrar dene."};
    }

    const profileUpdate: Record<string, string | null> = {
        bio: emptyToNull(input.bio),
        x_url: emptyToNull(input.xUrl),
        instagram_url: emptyToNull(input.instagramUrl),
        telegram_url: emptyToNull(input.telegramUrl),
        tiktok_url: emptyToNull(input.tiktokUrl),
        facebook_url: emptyToNull(input.facebookUrl),
    };
    // profile_photo is only included (and thus only ever overwritten) when a
    // new avatar was actually uploaded this submit — omitting the key keeps
    // the existing photo untouched otherwise.
    if (input.profilePhoto) {
        profileUpdate.profile_photo = input.profilePhoto;
    }

    // user_profiles row is guaranteed to exist here: every (app) route is
    // gated behind /complete-profile (Task 10), which requires a username
    // and therefore already creates this row.
    const {error: profileError} = await supabase
        .from("user_profiles")
        .update(profileUpdate)
        .eq("id", user.id);
    if (profileError) {
        console.error("updateProfileAction (user_profiles):", profileError.message);
        return {error: "Kaydedilemedi, tekrar dene."};
    }

    return {success: true};
};

export const appleSignInAction = async (next?: string) => {
    const supabase = await createClient();
    const target = safeNextPath(next) ?? '/lost-found';

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: `${process.env.PUBLIC_URL}/auth/oauth?next=${encodeURIComponent(target)}`,
                scopes: 'name email',
            },
        });

        if (error) throw error;

        return data.url;
    } catch (error) {
        console.error('Apple Sign In error:', error);
        throw error;
    }
};

export const googleSignInAction = async (next?: string) => {
    const supabase = await createClient();
    const target = safeNextPath(next) ?? '/lost-found';

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${process.env.PUBLIC_URL}/auth/oauth?next=${encodeURIComponent(target)}`,
                scopes: 'email profile',
            },
        });

        if (error) throw error;

        return data.url;
    } catch (error) {
        console.error('Google Sign In error:', error);
        throw error;
    }
};

// ── F2 sosyal katman: follow/block mutasyonları ──────────────────────────────
// Hepsi session-authoritative: user_id daima getUser()'dan, client'tan yalnızca
// targetUserId. TEK GERÇEK KORUMA budur — user_followings/user_blockings/
// user_profiles için RLS insert policy'leri `with check (true)` (izin verici),
// yani bu action'lar user_id'yi session'dan set etmezse RLS backstop OLMAZ. Bu
// deseni zayıflatma. insert'ler idempotent (unique violation → sessiz başarı) —
// çift tık hata üretmez. Buton client'ı dönüşü yorumlar.

type SocialActionResult = { ok: true } | { error: string };

// Postgres unique-violation kodu — zaten-takip / zaten-engelli çift insert'te.
const PG_UNIQUE_VIOLATION = '23505';

export const followUserAction = async (
  targetUserId: string,
): Promise<SocialActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!targetUserId || targetUserId === user.id) {
    return { error: 'Geçersiz istek.' };
  }

  const { error } = await supabase
    .from('user_followings')
    .insert({ user_id: user.id, followed_user_id: targetUserId });
  if (error && error.code !== PG_UNIQUE_VIOLATION) {
    console.error('followUserAction:', error.message);
    return { error: 'Takip edilemedi, tekrar dene.' };
  }
  return { ok: true };
};

export const unfollowUserAction = async (
  targetUserId: string,
): Promise<SocialActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!targetUserId) return { error: 'Geçersiz istek.' };

  const { error } = await supabase
    .from('user_followings')
    .delete()
    .eq('user_id', user.id)
    .eq('followed_user_id', targetUserId);
  if (error) {
    console.error('unfollowUserAction:', error.message);
    return { error: 'Takip bırakılamadı, tekrar dene.' };
  }
  return { ok: true };
};

export const blockUserAction = async (
  targetUserId: string,
): Promise<SocialActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!targetUserId || targetUserId === user.id) {
    return { error: 'Geçersiz istek.' };
  }

  const { error } = await supabase
    .from('user_blockings')
    .insert({ user_id: user.id, blocked_user_id: targetUserId });
  if (error && error.code !== PG_UNIQUE_VIOLATION) {
    console.error('blockUserAction:', error.message);
    return { error: 'Engellenemedi, tekrar dene.' };
  }
  return { ok: true };
};

export const unblockUserActionById = async (
  targetUserId: string,
): Promise<SocialActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı.' };
  if (!targetUserId) return { error: 'Geçersiz istek.' };

  const { error } = await supabase
    .from('user_blockings')
    .delete()
    .eq('user_id', user.id)
    .eq('blocked_user_id', targetUserId);
  if (error) {
    console.error('unblockUserActionById:', error.message);
    return { error: 'Engel kaldırılamadı, tekrar dene.' };
  }
  return { ok: true };
};
