# Admin paneli — canlı DB baseline & §11 bilinmeyen çözümleri

**Tarih:** 2026-08-21 · **Kaynak:** Supabase MCP salt-okunur sorgular, project `uynwrqccvfcwunrzoxva` (prod)

## Bulgular

### 1. `reports.status` kullanımı
Mevcut 3 rapor da `status='pending'`. **Mobil status'ü hiç değiştirmiyor** — actioned/dismissed'a
geçiren yok. Moderasyon kuyruğu gerçekten incelenmemiş; web transition'ları sahiplenebilir.

### 2. `adoptions` kolonları — `adopted_at` YOK
`adopted` (boolean) + `status` (enum) var; **`adopted_at` yok**. `updated_at`,
`lifecycle_last_activity_at` var ama sahiplenme-anı için güvenilir değil. 30 günlük sahiplenme
kohortu için ileride `adopted_at timestamptz` eklenmeli; o zamana dek yalnız anlık `adopted=true` sayısı.

### 3. `auth.users.banned_until` = SADECE silme-tombstone'u
144 kullanıcı; **6 banlı, 6'sı da `infinity`** — tam olarak 6 silinmiş hesap (`account_deletions` = 6).
Yani `banned_until='infinity'` yalnızca hesap-silme tombstone'u. **Moderasyon ban'ı bunu KULLANAMAZ**
(silinmiş gibi görünür). → Ayrı `user_bans` tablosu; "silinmiş" (account_deletions satırı) vs "banlı"
(user_bans satırı) ayırt edilebilir kalır. Geçici ban için finite `banned_until` düşünülebilir ama
kalıcı ban `infinity` ile YAPILMAZ.

### 4. Admin/rol izi
`%admin%`/`%role%` kolon araması **boş** — hiçbir yerde rol kavramı yok. `admin_users` güvenle kurulur.

### 5. `mark_reunited` attribution (Patify-katkısı metriği)
`via_patify` + `helper_user_id` + `owner_id` → `public.lost_found_reunions`'a yazılıyor; listing
`status='cozuldu'`. Yani **"Patify sayesinde kavuşma" metriği yapılabilir** (`lost_found_reunions
where via_patify=true`). Çözüm-zamanı = reunions satırının zamanı.

### 6. RLS baseline (admin okuma için KRİTİK)
Normal cookie-session client RLS altında sadece **kendi** verisini görür:
- `reports`: "reports read own only" (authenticated, own) — **admin başkasının raporunu okuyamaz**.
- `user_blockings`: "reads only authenticated owner".
- `user_private`: "owner select".
- `adoptions`/`lost_found`/`emergency_cases`: SELECT authenticated'a açık (browse için); yazma owner-only.
- `notifications`: own only (public role).

**Sonuç:** Moderasyon/kullanıcı-detay/blok okumaları **SECURITY DEFINER admin-RPC** (içinde
`admin_users` kontrolü) ile yapılmalı — doğrudan tablo okuması RLS'e takılır. Service-role client
yalnız Auth ban için.

## P1'e taşınan RULING'ler
- **P1-A:** Moderasyon cross-user okumaları SECURITY DEFINER admin-RPC (admin_users guard) ile. Service-role yalnız ban. (RLS own-only doğrulandı.)
- **P1-B:** Moderasyon ban = yeni `user_bans` tablosu (+ opsiyonel finite auth banned_until enforcement). `banned_until='infinity'` ASLA (silme tombstone'u; 6/6 infinity = silinmiş hesap).
- **P1-C:** `adoptions.adopted_at` yok → P1/P2 migration'ı ekler; tarihsel sahiplenme başarısı veri birikene dek anlık.
- **Bilgi:** LF kavuşma attribution'ı `lost_found_reunions.via_patify`'de mevcut → metrik uygulanabilir.
