import { redirect } from 'next/navigation';
import { FormMessage, Message } from '@/components/form-message';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { DeleteAccountForm } from './delete-account-form';
import { ExportDataButton } from './export-data-button';

// Hosts both data export (KVKK m.11 / GDPR Art.20) and account deletion on
// one page — linked from the settings hub's "Veri" + "Tehlikeli alan"
// sections AND from the /accept-consent wall's "Hesabı sil" exit. The
// second entry point is why this route is listed in lib/auth/gate.ts's
// GATE_EXEMPT: a session mid-consent-reprompt must still be able to reach
// it, or the "Hesabı sil" link would just bounce back to /accept-consent.
//
// Reads user/provider directly via supabase.auth.getUser() (not
// getCurrentUserProfile()) because CurrentUserProfile doesn't carry
// app_metadata.provider — same as profile/change-password/page.tsx, which
// needs the same field for the same reason (gating the password form).
export default async function DeleteAccountPage(props: {
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
      <h1 className="text-2xl font-bold">Verilerim ve hesabım</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Veri</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verilerimi dışa aktar</CardTitle>
            <CardDescription>
              Hesabınla ilişkili verilerin bir kopyasını JSON dosyası olarak indir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExportDataButton />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-destructive">Tehlikeli alan</h2>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Hesabı sil</CardTitle>
            <CardDescription>
              Bu işlem geri alınamaz. Profilin, gönderilerin ve yüklediğin dosyalar kalıcı olarak
              silinir.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <DeleteAccountForm isEmailProvider={isEmailProvider} />
            <FormMessage message={searchParams} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
