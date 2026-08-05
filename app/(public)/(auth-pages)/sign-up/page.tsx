import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { latestBirthDateForAge, MIN_SIGNUP_AGE } from "@/lib/consent";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  // Native date-input constraint validation blocks submit client-side for
  // anyone under MIN_SIGNUP_AGE; signUpAction re-validates server-side.
  const maxBirthDate = latestBirthDateForAge(MIN_SIGNUP_AGE);

  return (
    <>
      <form className="flex flex-col min-w-64 max-w-80 mx-auto">
        <h1 className="text-2xl font-medium">Kayıt Ol</h1>
        <p className="text-sm text text-foreground">
          Zaten bir hesabın var mı?{" "}
          <Link className="text-primary font-medium underline" href="/auth/login">
            Giriş yap
          </Link>
        </p>
        <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" name="email" placeholder="john@patify.net" required />
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            name="password"
            placeholder="Şifreniz"
            minLength={6}
            required
          />
          <Label htmlFor="birthDate">Doğum tarihi</Label>
          <Input
            id="birthDate"
            type="date"
            name="birthDate"
            min="1900-01-01"
            max={maxBirthDate}
            required
          />

          <div className="flex items-start gap-2 mb-3">
            <Checkbox id="consent" name="consent" required className="mt-0.5" />
            <Label htmlFor="consent" className="font-normal leading-snug">
              <Link
                href="/tos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Kullanım Koşulları
              </Link>{" ve "}
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

          <div className="flex items-start gap-2 mb-3">
            <Checkbox id="analyticsConsent" name="analyticsConsent" className="mt-0.5" />
            <Label htmlFor="analyticsConsent" className="font-normal leading-snug">
              Uygulama kullanım istatistiklerimin toplanmasına izin veriyorum.
            </Label>
          </div>

          <SubmitButton formAction={signUpAction} pendingText="Kayıt olunuyor...">
            Kayıt Ol
          </SubmitButton>
          <FormMessage message={searchParams} />
        </div>
      </form>
      <SmtpMessage />
    </>
  );
}
