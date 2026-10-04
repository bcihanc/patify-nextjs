import { unsubscribeAction } from "./actions";

export const metadata = {
  title: "Patify",
  robots: { index: false, follow: false },
};

/// E-posta özetindeki "bildirimleri kapat" linkinin açılış sayfası.
/// GET hiçbir şey yazmaz (posta tarayıcıları linki önceden açar); tercihi yalnızca
/// düğmenin server action'ı değiştirir.
export default async function EpostaCikisPage(props: {
  searchParams: Promise<{ u?: string; t?: string; r?: string }>;
}) {
  const { u, t, r } = await props.searchParams;

  let tr: string;
  let en: string;
  let form = false;
  if (!u?.trim() || !t?.trim() || r === "invalid") {
    tr = "Bağlantı geçersiz.";
    en = "Invalid link.";
  } else if (r === "ok") {
    tr =
      "E-posta bildirimleri kapatıldı. Uygulamadaki Bildirim Ayarları'ndan yeniden açabilirsin.";
    en =
      "Email notifications are off. You can turn them back on in the app's Notification Settings.";
  } else if (r === "error") {
    tr = "Bir hata oluştu. Lütfen biraz sonra tekrar dene.";
    en = "Something went wrong. Please try again later.";
  } else {
    tr = "E-posta bildirimlerini kapatmak istiyor musun?";
    en = "Turn off email notifications?";
    form = true;
  }

  return (
    <div className="max-w-md mx-auto py-12 space-y-4">
      <p>{tr}</p>
      <p>{en}</p>
      {form && (
        <form action={unsubscribeAction}>
          <input type="hidden" name="u" value={u} />
          <input type="hidden" name="t" value={t} />
          <button
            type="submit"
            className="rounded-md bg-foreground text-background px-4 py-2"
          >
            Kapat / Turn off
          </button>
        </form>
      )}
    </div>
  );
}
