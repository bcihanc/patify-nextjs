"use server";

import {createClient} from "@/lib/supabase/server";
import {encodedRedirect} from "@/utils/utils";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {isAtLeastAge, MIN_SIGNUP_AGE, PP_VERSION, TOS_VERSION} from "@/lib/consent";


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
        return encodedRedirect("error", "/sign-up", error.message);
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
    const supabase = await createClient();

    const {error} = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return encodedRedirect("error", "/auth/login", error.message);
    }

    return redirect("/home");
};

export const forgotPasswordAction = async (formData: FormData) => {
    const email = formData.get("email")?.toString();
    const supabase = await createClient();
    const origin = (await headers()).get("origin");
    const callbackUrl = formData.get("callbackUrl")?.toString();

    if (!email) {
        return encodedRedirect("error", "/forgot-password", "Email is required");
    }

    const {error} = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?redirect_to=/home/reset-password`,
    });

    if (error) {
        console.error(error.message);
        return encodedRedirect(
            "error",
            "/forgot-password",
            "Could not reset password"
        );
    }

    if (callbackUrl) {
        return redirect(callbackUrl);
    }

    return encodedRedirect(
        "success",
        "/forgot-password",
        "Check your email for a link to reset your password."
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
            "Password and confirm password are required"
        );
    }

    if (password !== confirmPassword) {
        return encodedRedirect("error", "/home/reset-password", "Passwords do not match");
    }

    const {error} = await supabase.auth.updateUser({
        password: password,
    });

    if (error) {
        return encodedRedirect("error", "/home/reset-password", "Password update failed");
    }

    return encodedRedirect("success", "/home/reset-password", "Password updated");
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

export const deleteAccountAction = async () => {
    const supabase = await createClient();
    await supabase.functions.invoke("delete-authenticated-user", {
        method: "DELETE",
    });

    await supabase.auth.signOut();

    return redirect("/auth/login");
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

export const appleSignInAction = async () => {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: `${process.env.PUBLIC_URL}/auth/oauth?next=/home`,
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

export const googleSignInAction = async () => {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${process.env.PUBLIC_URL}/auth/oauth?next=/lost-found`,
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
