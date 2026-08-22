import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getUserDetail } from '@/lib/admin/users';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export default async function AdminUserDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { profile, pii, ban, content, recentModeration } = detail;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">@{profile.username}</h1>
        {detail.isTrusted && <Badge variant="secondary">Güvenilir</Badge>}
        {detail.isBanned && <Badge variant="destructive">Banlı</Badge>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Kullanıcı ID" value={profile.id} />
            <Field label="Kayıt tarihi" value={formatDateTime(profile.createdAt)} />
            <Field label="Son görülme" value={profile.lastSeen ? formatDateTime(profile.lastSeen) : '—'} />
            <Field label="Bio" value={profile.bio ?? '—'} />
          </CardContent>
        </Card>

        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Kişisel veri (PII)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {pii ? (
              <>
                <Field label="Telefon" value={pii.phone ?? '—'} />
                <Field label="Doğum tarihi" value={pii.birthDate ?? '—'} />
                <Field label="Şehir / İlçe" value={`${pii.homeCity ?? '—'} / ${pii.homeDistrict ?? '—'}`} />
                <Field label="DM'lere açık" value={pii.acceptsDms ? 'Evet' : 'Hayır'} />
                <Field
                  label="Onay tarihi"
                  value={pii.consentAcceptedAt ? formatDateTime(pii.consentAcceptedAt) : '—'}
                />
                <Field label="ToS / PP sürümü" value={`${pii.tosVersion ?? '—'} / ${pii.ppVersion ?? '—'}`} />
              </>
            ) : (
              <p className="col-span-2 text-sm text-muted-foreground">Kişisel veri kaydı yok.</p>
            )}
          </CardContent>
        </Card>

        {ban && (
          <Card className="border-red-500/50 bg-red-500/5 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Ban detayı</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <Field label="Gerekçe" value={ban.reason ?? '—'} />
              <Field label="Bitiş" value={ban.bannedUntil ? formatDateTime(ban.bannedUntil) : 'Kalıcı'} />
              <Field label="Ban tarihi" value={formatDateTime(ban.createdAt)} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">İçerik</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Kayıp-Bulundu" value={String(content.lostFound)} />
            <Field label="Sahiplendirme" value={String(content.adoptions)} />
            <Field label="Gönderi" value={String(content.posts)} />
            <Field label="Acil durum" value={String(content.emergency)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Gelen rapor sayısı" value={String(detail.reportsAgainst)} />
            <Field label="Bloklayan kişi sayısı" value={String(detail.blocksAgainst)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Son moderasyon geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {recentModeration.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu kullanıcıyı hedefleyen bir moderasyon aksiyonu yok.</p>
          ) : (
            <ul className="space-y-2">
              {recentModeration.map((m, i) => (
                <li key={i}>
                  {i > 0 && <Separator className="mb-2" />}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">{m.action}</Badge>
                    {m.targetEntity && <span className="text-muted-foreground">{m.targetEntity}</span>}
                    <span className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                  </div>
                  {m.reason && <div className="text-sm text-muted-foreground">{m.reason}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
