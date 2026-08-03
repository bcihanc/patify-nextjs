import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptConsentAction, signOutAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { latestBirthDateForAge, MIN_SIGNUP_AGE } from "@/lib/consent";
import { getCurrentUserProfile } from "@/lib/profile/server";

// Consent wall (app-group gate, Task 6): a logged-in user with missing or
// stale ToS/PP consent lands here and cannot reach the rest of the app until
// they accept — there's deliberately no back/skip affordance on this page;
// the (app) layout's gate re-checks on every navigation, so leaving without
// accepting just routes back here.
export default async function AcceptConsentPage(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/auth/login");

  // Native date-input constraint validation blocks submit client-side for
  // anyone under MIN_SIGNUP_AGE; acceptConsentAction re-validates server-side.
  const maxBirthDate = latestBirthDateForAge(MIN_SIGNUP_AGE);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <form className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold">Devam etmeden önce</h1>
            <p className="text-muted-foreground">
              Kullanım koşulları veya gizlilik politikası güncellendi. Devam etmek için
              doğum tarihini onayla ve güncel koşulları kabul et.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthDate">Doğum tarihi</Label>
            <Input
              id="birthDate"
              type="date"
              name="birthDate"
              min="1900-01-01"
              max={maxBirthDate}
              defaultValue={profile.birthDate ?? undefined}
              required
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="consent" name="consent" required className="mt-0.5" />
            <Label htmlFor="consent" className="font-normal leading-snug">
              <Link
                href="/tos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Kullanım Koşulları
              </Link>{" "}
              ve{" "}
              <Link
                href="/pp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Gizlilik Politikası
              </Link>
              &apos;nı okudum, kabul ediyorum.
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="analyticsConsent" name="analyticsConsent" className="mt-0.5" />
            <Label htmlFor="analyticsConsent" className="font-normal leading-snug">
              Uygulama kullanım istatistiklerimin toplanmasına izin veriyorum.
            </Label>
          </div>

          <SubmitButton formAction={acceptConsentAction} pendingText="Kaydediliyor...">
            Kabul et
          </SubmitButton>

          <FormMessage message={searchParams} />
        </form>

        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
          <form action={signOutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Çıkış yap
            </Button>
          </form>
          <Button asChild variant="ghost" className="w-full text-destructive">
            <Link href="/profile/delete">Hesabı sil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
