import { redirect } from 'next/navigation';
import { changePasswordAction } from '@/app/actions';
import { FormMessage, Message } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';

// Password change only makes sense for email/password accounts — Google/Apple
// sign-in has no Supabase-managed password to change, so those accounts see a
// short explainer instead of the form (mirrors the provider check the action
// itself re-runs server-side).
export default async function ChangePasswordPage(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const isEmailProvider = user.app_metadata?.provider === 'email';

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Şifre değiştir</h1>

      {!isEmailProvider ? (
        <p className="text-sm text-muted-foreground">
          Şifre değiştirme yalnızca e-posta ile giriş yapan hesaplar içindir.
        </p>
      ) : (
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Mevcut şifre</Label>
            <Input id="currentPassword" type="password" name="currentPassword" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">Yeni şifre</Label>
            <Input id="newPassword" type="password" name="newPassword" minLength={6} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Yeni şifre (tekrar)</Label>
            <Input id="confirmPassword" type="password" name="confirmPassword" minLength={6} required />
          </div>

          <SubmitButton formAction={changePasswordAction} pendingText="Kaydediliyor...">
            Şifreyi güncelle
          </SubmitButton>

          <FormMessage message={searchParams} />
        </form>
      )}
    </div>
  );
}
