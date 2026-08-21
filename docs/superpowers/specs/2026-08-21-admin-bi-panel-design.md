# Patify Admin & BI Paneli — Tasarım Spec'i

**Tarih:** 2026-08-21
**Durum:** Tasarım onaylandı (brainstorming), uygulama planı bekliyor
**Kapsam:** Yeni alt-sistem — Next.js web app içinde `app/(admin)/` admin konsolu
**Supabase projesi:** `patify` (`uynwrqccvfcwunrzoxva`, Postgres 15)

---

## 1. Amaç ve bağlam

Patify'ın bugün **hiçbir admin yüzeyi yok**. Kullanıcılar içerik raporluyor ama kimse
incelemiyor; feedback geliyor ama kimse görmüyor; tüm operasyonel iş (ban, feature-flag,
bakım modu) canlı DB'de elle `service_role` SQL ile yapılıyor. Aynı zamanda backend'de
**olgun ama tüketicisi olmayan bir BI katmanı** duruyor: 11 SQL metrik view'ı, `metrics_daily`
snapshot tablosu ve gecelik `pg_cron` job'u — mobil repo'daki `docs/metrics.md` bunu açıkça
"dashboard yok, tüketim SQL-on-demand" diye belgeliyor.

Bu spec, o iki boşluğu tek bir konsolla kapatır: **operasyonel iş kuyruğu + moderasyon
aksiyonları + mevcut metrik ambarının sunumu.**

### Tasarımı yönlendiren temel gerçek
BI'nin zor kısmı (metrik tanımı + hesaplama + tarihsel snapshot) **zaten yapılmış**. Web
paneli metrikleri **hesaplamaz**; `metrics_daily`'yi okur ve operasyonel kuyruklar için canlı
admin-RPC'ler çağırır. Bu, veri-mimarisi riskini büyük ölçüde ortadan kaldırır.

---

## 2. Onaylanan kararlar (karar ağacı)

| # | Karar | Sonuç |
|---|---|---|
| K1 | v1 kapsamı | **Tam konsol**: Overview · Moderasyon · Feedback · Metrikler · Kullanıcılar · İçerik · Ops(flag/release-gate) · Push |
| K2 | Yetki modeli | **Tek seviye admin**, `admin_users` tablosu ile (ileride seviyelere bölünebilir rol sütunu) |
| K3 | Konum | **Aynı repo**, yeni `app/(admin)/` route group |
| K4 | PII/KVKK | **Tam görünür** — ama PII tekil kullanıcı detayında (toplu listede kolon değil) + sessiz erişim logu (öneri, vetolanabilir) |
| K5 | Moderasyon aksiyonları | **Tam set**: dismiss + gizle(pasif) + uyar + banla + append-only audit |
| K6 | Flag/release-gate | **Hepsi yazılabilir**, onay diyalogları + invaryant guard'ları ile |
| K7 | Push | **Denetim + hedefli tekil + şehir/segment toplu broadcast** (ekstra onay + rate-limit) |
| K8 | Veri mimarisi | Canlı admin-RPC/view + mevcut `metrics_daily` snapshot okuması — **yeni rollup pipeline YOK** |
| K9 | DB source-of-truth | Web repo'da commit'li migration yok → tüm DB değişiklikleri **mobil repo** `supabase/migrations/`'da yazılır |
| K10 | Overview yerleşimi | **İş kuyruğu önce** (Varyant A) — grafik galerisi değil, karar üreten kuyruk |
| K11 | İnşa sırası | **A**: P0 Temel → P1 Moderasyon/Feedback → P2 Overview/Metrikler → P3 Kullanıcı/İçerik → P4 Ops/Push |

---

## 3. Mimari

### 3.1 Route group ve layout
- Yeni `app/(admin)/` route group — mevcut `(app)` tüketici kabuğundan (AppShell bottom-nav,
  username/consent gate) **ayrı**. Admin kendi kabuğunu (sol nav) alır, tüketici onboarding
  gate'ine tabi değildir.
- `app/(admin)/layout.tsx` **yetkili gate**: `getUser()` → `admin_users` üyelik kontrolü →
  admin değilse `notFound()` (404; panelin varlığını sızdırma, redirect etme).
- `middleware.ts` / `lib/supabase/middleware.ts`: `AUTHED_PREFIXES`'e `/admin` eklenir —
  **sadece coarse** (giriş yapmamışı `/auth/login`'e yolla). Rol kararı middleware'e taşınmaz;
  o layout'ta ve her action'da yapılır. `resolveGateRedirect` **değiştirilmez**.
- `getUser()` çağrısı ve cookie yenileme davranışı korunur (mevcut inline uyarılar geçerli).

### 3.2 Erişim kontrolü (savunma zinciri)
1. Kimlik: mevcut cookie tabanlı Supabase oturumu (`getUser()`).
2. Yetki: `admin_users` kaydı var mı? (`requireAdmin()` — `lib/admin/auth.ts`).
3. `admin_users` RLS: kullanıcı **yalnız kendi** üyelik satırını okuyabilir; client'tan
   insert/update/delete **yok**. İlk admin (cihan) canlı DB'de elle seed edilir.
4. Tüm admin verisi (reports, audit, metrics, içerik yazma) **admin-only RLS/RPC** arkasında.
5. **Her Server Action kimliği + admin üyeliğini yeniden doğrular.** Layout kontrolüne güvenip
   mutation çalıştırılmaz.
6. **Service-role client yalnız gerçekten RLS-bypass gereken işlemde** (Supabase Auth ban).
   `lib/supabase/admin.ts` → `createAdminClient()`, server-only. `SUPABASE_SERVICE_ROLE_KEY`
   **asla** `NEXT_PUBLIC_*` olamaz, Client Component'a giremez. Dashboard okumaları ve içerik
   güncellemeleri mümkün olduğunca admin-RLS + normal server client + SECURITY DEFINER RPC ile.

### 3.3 Veri erişim stratejisi (K8)
- **Tarihsel/trend metrikler** → `metrics_daily`'den oku (kaynak tablolar mutasyona uğrasa da
  history korunur). Snapshot'ı `snapshot_daily_metrics()` gecelik `pg_cron` (`analytics-daily-snapshot`, 06:15 UTC) yazıyor.
- **Operasyonel/anlık kuyruklar** (açık raporlar, SLA, kritik aciller, yaşlı ilanlar) → canlı
  admin-RPC. Snapshot'ta yok, gerçek-zamanlı olmalı.
- **Yeni rollup pipeline kurulmaz.** Dashboard yükü birkaç operatör + sınırlı aggregate.
  Retention cohort en pahalı sorgu; günlük + dar tarih aralığıyla canlı çalışır. p95 dashboard
  yükü kabul edilemez olursa **sonra** materialized view (yalnız retention/outcome serileri;
  moderasyon backlog'u canlı kalır).
- Dashboard browser'dan **asla** domain tablolarına doğrudan sorgu atmaz — hep admin-RPC/güvenli view.
- `chats` ayrı Postgres şemasında, epoch-ms alanlarla; engagement sorguları `public` timestamp'lerine normalize eder.
- **PII BI aggregate'ına girmez**: mesaj metni, notification body, telefon, kesin konum hiçbir
  metrik sorgusuna taşınmaz.

### 3.4 Cross-repo migration sahipliği (K9)
Web repo'da commit'li migration/RLS/RPC **yok** (`supabase/.temp` boş). Mobil repo 177
migration'ı git'te izliyor → **DB source-of-truth mobil repo**. Bu spec'in gerektirdiği tüm
şema/RLS/RPC değişiklikleri **`/Users/cihan/IdeaProjects/patify/supabase/migrations/`**'da
yazılır; web repo yalnız UI + Server Actions barındırır. `database.types.ts` migration'lardan
sonra yeniden üretilir (bugün bayat — örn. `reports.status` DB'de var, tiplerde yok).

---

## 4. Veri modeli değişiklikleri (mobil repo migration'ları)

> Her biri canlı şema doğrulamasından **sonra** kesinleşir (§11). Kolon adları taslak.

1. **`admin_users`** — `user_id uuid PK REFERENCES auth.users`, `role text DEFAULT 'admin'`,
   `created_at`, `created_by uuid`. RLS: select-own; client write kapalı.
2. **`reports` inceleme kolonları** — mevcut `status` (pending/actioned/dismissed) coarse kalır;
   eklenir: `resolution` enum (`dismissed|warned|content_removed|user_banned`, pending iken NULL),
   `reviewed_by uuid`, `reviewed_at timestamptz`, `review_note text`. Karar granülerliği BI'ı
   bozmadan ayrı tutulur ("kapatıldı" suçsuz-dismiss ile ban'ı aynı sepete koymaz).
3. **`moderation_actions`** (append-only audit) — `id`, `created_at`, `actor_admin uuid`,
   `action text` (`dismiss|hide_content|reactivate|warn|ban|unban`), `target_entity`,
   `target_entity_id`, `target_user_id`, `report_id uuid NULL`, `reason text`, `meta jsonb`.
   RLS: admin-only select; insert yalnız admin-RPC/service; **update/delete yok** (UI'dan değiştirilemez).
4. **`user_bans`** (moderasyon ban'ı — deletion tombstone'dan **ayrı**) — `user_id`,
   `banned_until timestamptz NULL` (NULL=kalıcı ya da tersi, tasarımda netleştir), `reason`,
   `banned_by`, `created_at`. **Gerekçe:** mobil `auth.users.banned_until='infinity'`'yi
   *hesap silme tombstone'u* olarak kullanıyor — moderasyon ban'ı bununla çakışmamalı. Sert
   uygulama için service-role Auth ban da yapılır ama "silinmiş" (account_deletions satırı var)
   ile "banlı" (user_bans satırı var) DB'de ayırt edilebilir kalır.
5. **`admin_access_log`** (K4 önerisi, vetolanabilir) — `id`, `created_at`, `admin_id`,
   `action` (`view_user_pii|view_contact|export`), `target_user_id`, `context`. Arka planda
   sessiz; admini yasal olarak korur, iş akışını yavaşlatmaz.
6. **Uyarı bildirimi** — `notifications`'a yeni `type='admin_warning'` değeri; `emit_notification`
   üstünden yazan bir admin-RPC (`admin_warn_user`).
7. **Doğrulanacak/eklenecek kolonlar** — `adoptions.adopted_at` (30g sahiplenme başarısı için;
   codex "görünmüyor" dedi, canlıda kontrol → yoksa ekle). `mark_reunited`'in `p_via_patify`
   attribution'ını hangi tabloda sakladığı doğrulanır (Patify-attributed reunion metriği için).

### 4.1 Admin RPC'leri (SECURITY DEFINER, `admin_users` guard'ıyla)
`admin_overview_counts()` · `admin_list_reports(...)` (entity+id grupla) ·
`admin_resolve_report(report_id, resolution, note)` · `admin_hide_content(entity, id, reason)` (→pasif) ·
`admin_reactivate_content(...)` · `admin_warn_user(user_id, message, report_id)` ·
`admin_list_users(...)` · `admin_user_detail(user_id)` (PII dahil, guard'lı) ·
`admin_content_health()` · `admin_metrics_series(metric, from, to)` (metrics_daily) ·
`admin_set_flag(key, enabled)` · `admin_get_release_gate()` · `admin_set_release_gate(...)` (invaryantlı) ·
`admin_push_audit(...)`. **Ban** RPC değildir: server-only service-role client → `auth.admin.updateUserById`
(veya `user_bans` + enforce), her zaman `moderation_actions`'a yazılır.

---

## 5. Bilgi mimarisi (onaylı — 8 bölüm)

```
/admin
├── 📊 Genel Bakış      İş kuyruğu (açık rapor·SLA·kritik acil·yaşlı ilan) + North Star + çözülen vaka
├── 🛡️ Moderasyon       Rapor kuyruğu (entity+id grupla) → dismiss/gizle/uyar/banla + audit
├── 💬 Feedback         Geri bildirim kutusu (kategori·mesaj·sürüm·ekran görüntüsü) durum makinesi
├── 📈 Metrikler        North Star·funnel·retention·ölü özellik·içerik sağlığı (metrics_daily + canlı)
├── 👤 Kullanıcılar     Liste (aggregate) + detay (tam PII·trust·geçmiş)
├── 🐾 İçerik           LF/Adopt/Emergency durum·yaş·şehir; gizle(pasif)/tekrar aç
├── ⚙️ Ops / Flag'ler   app_flags + release-gate yaz (guardrail)
└── 🔔 Push             Denetim + hedefli + şehir/segment broadcast
```

---

## 6. Modül spec'leri

### 6.1 Genel Bakış (Varyant A — iş kuyruğu önce)
- **Üst şerit (dikkat gerekenler):** 4 renkli, tıklanabilir sayı kartı — açık rapor (en yaşlı X),
  SLA ihlali (>24s incelenmemiş rapor), kritik acil (6s+ üstlenilmemiş `emergency_cases`),
  yaşlı ilan (30g+ `kayip`/`open`). Her sayı → ilgili filtreli listeye götürür.
- **Orta:** ⭐ North Star (48s yanıt) **pay/payda + oran** (asla çıplak %) + 8 haftalık sparkline;
  🐾 bu hafta çözülen (LF cozuldu · adopt adopted · emergency cozuldu).
- **Alt:** yeni kayıt / aktif kullanıcı / yeni ilan mini trendleri.
- Her kart codex'in üç sorusuna cevap verir: ne oldu · hangi eşik aşıldı · şimdi nereye tıkla.
  4 hafta karar üretmeyen kart silinir.

### 6.2 Moderasyon kuyruğu
- **Gruplama:** aynı `entity + entity_id` raporları tek satırda topla (yeni "case" tablosu yok).
  Satırda: tekil raporlayan sayısı · rapor türü dağılımı · ilk/son rapor zamanı · içerik önizleme +
  sahibi · hedef kullanıcının son 7/30g tekil blocker sayısı · trust özeti (`trusted_member_flags`).
- **Durum makinesi:** `pending → (in_review) → resolved`; `resolution` ∈
  `dismissed|warned|content_removed|user_banned`.
- **Aksiyonlar:**
  - **Dismiss** — zorunlu kısa gerekçe; raporları resolved/dismissed işaretle.
  - **Gizle (content_removed)** — hard-delete değil, `pasif`/gizli (LF·Emergency `pasif` var; Adopt `pasif` destekliyor). Kanıt/itiraz için korunur.
  - **Uyar (warned)** — `admin_warning` notification + audit.
  - **Banla (user_banned)** — `user_bans` + service-role Auth ban; içerik kapsamını operatör ayrıca seçer (ban tek başına geçmiş içeriği otomatik gizlemez).
  - Her aksiyon **`moderation_actions`**'a yazılır.
- **Bloklar (`user_blockings`) ayrı:** kuyruk değil — kişisel güvenlik tercihi. Yalnız "aynı
  hedefe tekil blocker sayısı" risk sinyali; blocker kimlikleri gereksiz gösterilmez; otomatik
  ban üretmez; yüksek sinyalde "profili incele" görevi açar.
- **v1 kapsam sınırı:** report entity'lerinde profil/DM **yok** → v1 profil/DM moderasyonu tasarlanmaz.

### 6.3 Feedback kutusu
`feedback` tablosu (category, message, app_version, platform, os_version, screenshot_path, status).
Liste + detay; durum: `new → in_review → closed`. v1'de yanıt kanalı yok (triyaj + durum);
istenirse ileride `admin_warning` benzeri bir bildirimle yanıt.

### 6.4 Metrikler (BI)
- **Kaynak:** `metrics_daily` (trend/history) + canlı view'lar (`v_*`) admin-RPC ardında.
- **North Star çerçevesi (ikili):**
  - **Öncü gösterge:** `v_north_star_response_48h` / `north_star_response_rate_48h` — 48s içinde
    anlamlı yanıt (sighting/application/inbound DM). Mobil'in resmî North Star'ı, zaten snapshot'lı.
  - **Nihai sonuç:** haftalık çözülen vaka = `lost_found.cozuldu` + `adoptions.adopted` +
    `emergency_cases.cozuldu`. Codex önerisi; misyonu doğrudan ölçer. **"Son 7 gün" etiketi ancak
    sonuç-zamanı alanları (resolved_at/adopted_at/reunion zamanı) canlıda doğrulanınca kullanılır.**
- **Diğer metrikler (hazır):** funnel_signup (chain 3 aşama; `consent_accepted` **funnel aşaması
  değil**, diagnostic), funnel_lost_found, funnel_adoption, funnel_guest, retention_cohort,
  feature_usage_weekly, dead_features, chat_first_reply, (Layer B: form_dropoff, search_health —
  client event akınca dolar).
- **UI'a gömülü uyarılar (docs/metrics.md'den):**
  1. **n<30'da oranın yanında pay/payda göster.** "%100, n=1" yasak.
  2. **`day='2026-07-19'` snapshot'ını hariç tut** (fixture kirliliği).
  3. North Star chat-yarısı per-listing değil same-owner proxy — nota düş.
  4. Cohort, raporun çalıştığı güne değil kullanıcının ilk kayıt/ilk-aksiyon tarihine sabitlenir.
  5. D7 retention `last_seen` ile hesaplanmaz (pasif oturum yenilemesi ziyaret sanılır) — görev-retention.
  6. bump/reactivation yeni ilan/başarı sayılmaz. web+mobil aynı user_id = tek kişi.

### 6.5 Kullanıcılar
- **Liste:** ID · username · hesap yaşı · içerik/rapor/blok **aggregate**'leri. **PII kolon yok**
  (toplu-export riski). `account_deletions` churn sinyali ayrı.
- **Detay:** K4 gereği **tam PII** (phone, birth_date, home_city/district) + consent geçmişi +
  trust + içerik/rapor/moderasyon geçmişi. Erişim `admin_access_log`'a düşer (öneri).
- Harita: LF/Adopt için **maskeli** RPC sonucu (owner-aware mask RPC'de); service-role ham
  koordinata ulaşsa da UI otomatik göstermez. Emergency bilinçli maskesiz.

### 6.6 İçerik yönetimi
LF/Adopt/Emergency üç sekme: durum/yaş/şehir kırılımı. **Statüsler farklı, tek "status"a zorlanmaz:**
- LF: `kayip|bulundu|cozuldu|pasif`.
- Adopt: `status ∈ open|closed|pasif` **+ ayrı `adopted` boolean** — başarı kaynağı `adopted=true`,
  görünürlük `status`.
- Emergency: `acik|ustlenildi|cozuldu|pasif` + `claimed_at`/`resolved_at`.
Aksiyon: gizle(pasif) / tekrar aç → hep `moderation_actions`.

### 6.7 Ops / Flag'ler (K6 — yazılabilir + guardrail)
- `app_flags` (key, enabled) aç/kapat — düşük risk.
- `app_release_gate` (min_build_number hard-lock, recommended_build soft-nudge, maintenance =
  tüm sürümleri kilitler, latest_store_build) — **yazılabilir ama guardrail'li:**
  - Bakım modu / min-build yükseltme → **yazarak-onayla** (tehlikeli alan) diyaloğu.
  - **Invaryant:** `min_build_number`/`recommended_build`, `latest_store_build`'ı geçemez —
    "önce store build'i artır" guard'ı.
- Not: bazı gating **Firebase Remote Config**'de (Supabase değil) — panel orayı yönetmez, UI'da belirt.

### 6.8 Push (K7)
- **Denetim:** `push_send_audit` + `push_log` + `*_push_log` — ne, kime, rate-limit/dedupe, başarısızlık.
- **Hedefli tekil:** belirli kullanıcı/ilana bildirim veya rebroadcast (mevcut edge fn:
  `send_notification_to_user`, `rebroadcast-lost-found`).
- **Toplu broadcast:** şehir/segment (`reserve_city_pushes` vb.) — **ekstra onay (yazarak-onayla)
  + rate-limit + önizleme (kaç kişiye gidecek)**. Geri alınamaz; en dikkatli test edilecek yüzey.

---

## 7. Teknik seçimler
- **Grafik:** `recharts` (React 19 uyumlu, tree-shakeable, Tailwind v4 + shadcn stiline el-yapımı
  kartlarla oturur). Tablo: `@tanstack/react-table`.
- **Eklenecek shadcn primitifleri:** table, tabs, select, sheet, toast/sonner, separator, skeleton,
  alert-dialog (yazarak-onayla için).
- **Timezone:** saklama/hesap UTC; "bugün", günlük cohort, SLA sınırları SQL'de **`Europe/Istanbul`
  (IANA, sabit +3 değil)** takvimine çevrilir. UI'da yerel zaman; audit'te gerekince UTC.

## 8. Güvenlik & KVKK
- Service key server-only; RLS asıl savunma; her action admin re-check; audit append-only.
- PII detay sayfasında, listede değil; erişim loglanır (öneri); chat metni BI'a girmez; konum maskeli
  (emergency hariç); 90 günlük ham-analytics saklama + anonim aggregate korunur (`purge_stale_analytics`).
- Moderasyon audit saklama süresi/hukuki dayanağı KVKK sorumlusuyla netleştirilir (uygulama-dışı).

## 9. Hata yönetimi
- RLS 42501 → "yetkiniz yok"; RPC hatası → toast + log; guardrail ihlali → açık mesajla engelle.
- Yıkıcı aksiyonlarda (ban, broadcast, bakım modu) optimistic UI **yok** — `alert-dialog` +
  en tehlikelide yazarak-onay (ör. "BROADCAST" yaz).

## 10. Test stratejisi
Repo'da test runner yok. Doğrulama: (a) `npm run build` tip güvenliği; (b) **mobil repo'da SQL/pgTAP
testleri** (mevcut `supabase/tests/analytics_views_test.sql` deseni) — özellikle **güvenlik sınırı:**
"non-admin `admin_*` RPC'den permission denied / 0 satır alır" (Rule 7: test *neden*i kodlar);
(c) test kullanıcılarıyla manuel akış (CLAUDE.local.md hesapları). Ban/broadcast için staging/onaylı test.

## 11. Uygulamadan önce canlı DB'de doğrulanacaklar (her fazın kapısı)
1. Gerçek RLS politikaları + RPC ownership/grant'ları canlıdan export edilip incelenir (git'te yok — **admin yetkileri için kabul edilemez denetim açığı**; bunu source-of-truth'a taşımak P0'ın parçası).
2. `adoptions.adopted_at` var mı? `mark_reunited` `p_via_patify`'ı nereye yazıyor?
3. `reports.status`'u mobil zaten yazıyor mu? Mevcut kullanım.
4. `chats` şema timestamp formatı (epoch ms) normalizasyonu.
5. `auth.users.banned_until='infinity'` deletion-tombstone semantiği — ban çakışmasını önlemek için teyit.

## 12. Fazlar (sıra A)
- **P0 · Temel** — `admin_users` migration+RLS; `requireAdmin()` (`lib/admin/auth.ts`);
  `app/(admin)/layout.tsx` + middleware prefix; admin shell (sol nav); `createAdminClient()`
  (ban'a kadar kullanılmaz); recharts + tanstack-table + shadcn primitifleri; `database.types.ts`
  regen; canlı RLS/RPC export → source-of-truth. **Çıktı:** yalnız adminin erişebildiği boş gate'li shell.
- **P1 · Moderasyon + Feedback** — reports inceleme kolonları + `moderation_actions` + `user_bans`
  migration'ları; reports admin-RPC'leri; moderasyon kuyruğu UI (dismiss/gizle/uyar/banla);
  feedback kutusu + durum. **Çıktı:** acil operasyonel boşluk kapanır.
- **P2 · Overview + Metrikler** — `admin_overview_counts`; Overview (Varyant A); Metrik sayfaları
  (metrics_daily + view'lar, n<30 pay/payda + TZ). **Çıktı:** günlük iş ekranı + BI.
- **P3 · Kullanıcı + İçerik** — `admin_list_users`/`admin_user_detail` (PII detayda); içerik sağlığı + gizle/tekrar-aç.
- **P4 · Ops + Push** — flag + release-gate yazma (guardrail); push denetim + hedefli + broadcast.

Her faz kendi spec→plan→uygulama döngüsünü alır; bu doküman P0+P1'i uygulanabilir derinlikte,
sonrakileri çerçeve olarak verir.

## 13. v1 non-goal'ları
Özel chart builder, CSV scheduler, forecasting/anomaly detection, gelişmiş attribution, ayrı
warehouse, profil/DM moderasyonu, RBAC seviyeleri, mobil admin UI.
