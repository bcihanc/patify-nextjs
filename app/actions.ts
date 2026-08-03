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
        const {error: analyticsError} = await supabase.rpc("set_analytics_consent", {enabled: true});
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
