# Patify Gizlilik Politikası

**Yürürlük Tarihi:** 19 Temmuz 2026
**Son Güncelleme:** 19 Temmuz 2026

---

## 1. Veri Sorumlusu

Patify uygulamasının ("Uygulama") veri sorumlusu **Cihan Cengiz**'dir.

| Bilgi | Detay |
|-------|-------|
| Veri Sorumlusu | Cihan Cengiz |
| E-posta | b.cihancengiz@gmail.com |
| Uygulama | Patify (com.bcc.buschat) |

Kişisel verilerinizle ilgili her türlü başvurunuzu, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 11. maddesi kapsamındaki haklarınızı kullanmak amacıyla yukarıdaki e-posta adresine iletebilirsiniz. Başvurular azami 30 gün içinde yanıtlanır.

---

## 2. Toplanan Veri Kategorileri

Patify, aşağıdaki kategorilerdeki kişisel verileri işlemektedir.

### 2.1 Hesap Verileri

- **E-posta adresi** — kayıt ve kimlik doğrulama için.
- **Parola** — yalnızca hash'lenmiş biçimde saklanır; düz metin hiçbir zaman işlenmez.
- **Kullanıcı adı** — profil tanımlaması için.
- **Profil fotoğrafı** — isteğe bağlı, kullanıcı tarafından yüklenir.
- **Sosyal medya URL'leri** — isteğe bağlı, profil sayfasında gösterilir.
- **Telefon numarası** — isteğe bağlı.
- **Doğum tarihi** — yaş doğrulaması ve veli rızası akışı için (kayıt sırasında toplanır).

### 2.2 İçerik Verileri

Uygulamada oluşturduğunuz içerikler:

- Gönderiler ve gönderi fotoğrafları/videoları
- Yorumlar
- Tartışma soruları ve yanıtları
- Sahiplendirme ilanları
- Doğrudan mesajlar (DM)
- Oylar, beğeniler ve yer imleri
- Takip edilen / takipçi ilişkileri

### 2.3 Cihaz ve Teknik Veriler

- **IP adresi** — Sentry ve Supabase aracılığıyla; hata ayıklama ve güvenlik amacıyla.
- **İşletim sistemi sürümü** — push bildirim hedefleme için.
- **Uygulama sürümü** — hata izleme ve uyumluluk tespiti için.
- **Kilitlenme raporları** — Sentry üzerinden; uygulama stabilitesi için.

### 2.4 Konum Verisi

- **Cihaz GPS konumu** — yalnızca sahiplendirme ilanları akışında yakındaki ilanları göstermek için talep edilir; anlık olarak kullanılır, sunucularda saklanmaz.

### 2.5 Bildirim Verileri

- **OneSignal player_id** — push bildirimlerinin gönderilmesini sağlamak için.

---

## 3. İşleme Amaçları ve Hukuki Dayanak

Kişisel verilerinizi aşağıdaki amaçlarla ve hukuki dayanaklara göre işliyoruz.

| Amaç | Veri Kategorisi | Hukuki Dayanak |
|------|-----------------|----------------|
| Hesap oluşturma ve yönetimi | Hesap verileri | Sözleşmenin ifası (GDPR Madde 6(1)(b)); açık rıza (KVKK m.5/1) |
| Sosyal içerik sunma ve etkileşim | İçerik verileri | Sözleşmenin ifası (GDPR Madde 6(1)(b)); açık rıza (KVKK m.5/1) |
| Sahiplendirme ilanları için konum tabanlı arama | Konum verisi | Açık rıza — kullanıcı her seferinde konum paylaşmayı seçer (GDPR Madde 6(1)(a); KVKK m.5/1) |
| Push bildirim gönderimi | OneSignal player_id | Sözleşmenin ifası + açık rıza (GDPR Madde 6(1)(b)/(a)) |
| Uygulama hatalarını izleme ve kararlılık sağlama | Cihaz/teknik veriler | Meşru menfaat (GDPR Madde 6(1)(f); KVKK m.5/2-f) — uygulamanın güvenli ve kararlı çalışması |
| Kullanım istatistikleri (Patify altyapısı) | Uygulama içi davranış olayları | Açık rıza (GDPR Madde 6(1)(a); KVKK m.5/1) |

---

## 4. Saklama Süreleri

| Veri Türü | Saklama Süresi |
|-----------|----------------|
| Aktif hesap verileri | Hesap silinene kadar |
| Profil bilgileri (silme sonrası) | Anonimleştirilmiş biçimde süresiz; kişisel tanımlayıcılar hesap silinme tarihinden itibaren 30 gün içinde kaldırılır |
| Gönderiler, sahiplendirme ilanları, medya dosyaları | Hesap silinmesinden itibaren 30 gün içinde tamamen silinir |
| Mesajlar ve yorumlar | İçerik korunur; kullanıcı adı anonimleştirilmiş yer tutucu ile değiştirilir |
| Kilitlenme ve hata raporları (Sentry) | 90 gün (Sentry varsayılan saklama politikası) |
| Kullanım istatistikleri (ham) | 90 gün; süre sonunda anonimleştirilmiş toplu istatistiklere sıkıştırılır ve ham kayıt silinir |
| Kullanım istatistikleri (toplu/anonim) | Anonimleştirilmiş biçimde süresiz saklanır — kişiye bağlanamaz |
| Push bildirim tokenleri (OneSignal player_id) | Hesap silinince OneSignal çıkış (logout) işlemiyle temizlenir |
| Audit kayıtları | Yasal yükümlülükler doğrultusunda tutulabilir |

---

## 5. Veri İşleyenler (Alt İşleyiciler)

Patify, hizmetlerin yürütülmesi için aşağıdaki üçüncü taraf veri işleyenlerle çalışmaktadır. Bu işleyenlerle imzalanmış Veri İşleme Sözleşmeleri ("DPA") mevcuttur.

### 5.1 Supabase, Inc.
- **Konu:** Kimlik doğrulama, veritabanı, dosya depolama
- **Konum:** AWS altyapısı — ABD ve AB bölgeleri
- **DPA:** Supabase standart DPA (https://supabase.com/legal/dpa)

### 5.2 Google LLC (Firebase)
- **Konu:** Remote Config, push bildirim yönlendirme
- **Konum:** ABD ve AB bölgeleri
- **DPA:** Google standart DPA (https://cloud.google.com/terms/data-processing-addendum)

### 5.3 OneSignal, Inc.
- **Konu:** Push bildirim gönderimi
- **Konum:** ABD
- **DPA:** OneSignal standart DPA (https://onesignal.com/legal/dpa)

### 5.4 Sentry, Inc. (Functional Software, Inc.)
- **Konu:** Hata ve kilitlenme izleme
- **Konum:** ABD
- **DPA:** Sentry standart DPA (https://sentry.io/legal/dpa)

### 5.5 Google Sign-In
- **Konu:** OAuth tabanlı kimlik doğrulama
- **Konum:** Google altyapısı (ABD/AB)

### 5.6 Apple Sign-In
- **Konu:** OAuth tabanlı kimlik doğrulama
- **Konum:** Apple altyapısı (ABD/AB)

### Yurt Dışı Veri Aktarımı (KVKK Madde 9)

Yukarıda listelenen işleyenler ağırlıklı olarak ABD'de faaliyet göstermektedir. KVKK'nın 9. maddesi uyarınca, yeterli korumanın bulunduğu ülkelere veya standart veri koruma sözleşmeleriyle güvence altına alınmış ülkelere veri aktarımı açık rızanıza dayanarak gerçekleştirilmektedir. Uygulamayı kullanarak bu aktarıma rıza göstermiş olursunuz. Bu rızanızı geri çekme hakkına sahipsiniz; ancak rızanın geri çekilmesi, uygulamanın işlevselliğini kısmen veya tamamen kısıtlayabilir.

---

## 6. Kullanıcı Hakları

KVKK'nın 11. maddesi ve GDPR'nin 15-22. maddeleri kapsamında aşağıdaki haklara sahipsiniz:

1. **Bilgi edinme hakkı:** Kişisel verilerinizin işlenip işlenmediğini ve hangi kategorilerde işlendiğini öğrenebilirsiniz.
2. **Erişim hakkı:** İşlenen kişisel verilerinizin bir kopyasını talep edebilirsiniz. (Uygulama içi veri dışa aktarma özelliği: Sub-project F ile eklenecektir.)
3. **Düzeltme hakkı:** Yanlış veya eksik verilerinizin düzeltilmesini talep edebilirsiniz. Profil bilgilerinizi uygulama içinden doğrudan düzenleyebilirsiniz.
4. **Silme hakkı (unutulma hakkı):** Hesabınızı ve ilgili verilerinizi silmesini talep edebilirsiniz. Uygulama içindeki "Hesabı Sil" işlevi bu hakkı kullanmanızı sağlar.
5. **İşlemeye itiraz hakkı:** Meşru menfaate dayanan işleme faaliyetlerine itiraz edebilirsiniz.
6. **İşlemenin kısıtlanması hakkı:** Belirli koşullarda veri işlemenin kısıtlanmasını talep edebilirsiniz.
7. **Veri taşınabilirliği hakkı:** Verilerinizin yapılandırılmış, makine tarafından okunabilir biçimde tarafınıza teslim edilmesini talep edebilirsiniz. (Sub-project F ile hayata geçirilecektir.)
8. **Rızayı geri çekme hakkı:** Rızanıza dayanan tüm işleme faaliyetleri için rızanızı her zaman geri çekebilirsiniz.

**Başvuru Kanalı:** Tüm talepler için **b.cihancengiz@gmail.com** adresine e-posta gönderiniz. Başvurular kimlik doğrulamasının ardından azami **30 gün** içinde yanıtlanır. KVKK uyarınca yanıt ücretsizdir; aşırı veya tekrarlayan talepler için makul bir ücret alınabilir.

---

## 7. Yaş Kısıtlaması

Patify, **13 yaşın altındaki** kişilerin kullanımına uygun değildir. 13 yaşın altındaki kullanıcıların kişisel verilerini bilerek toplamıyoruz.

**13-16 yaş arası kullanıcılar (GDPR Madde 8 uyarınca):** Bu yaş grubundaki kullanıcıların uygulamayı kullanabilmesi için ebeveyn veya vasi rızası gerekmektedir. Kayıt akışında doğum tarihi sorulmakta; sisteme tanımlanan yaş sınırının altında olduğu tespit edilen hesaplar askıya alınmaktadır.

13 yaşın altında bir çocuğun verilerini yanlışlıkla topladığımıza dair bilginiz varsa, lütfen **b.cihancengiz@gmail.com** adresinden bize ulaşın. Bu tür veriler derhal silinecektir.

---

## 8. Çerezler ve İzleyiciler

Patify, bir mobil uygulamadır ve tarayıcı çerezi kullanmamaktadır.

Bununla birlikte uygulama, aşağıdaki tanımlayıcıları kullanmaktadır:

- **Kullanım istatistikleri (Patify altyapısı):** Hangi ekranların kullanıldığını ve kullanıcıların nerede takıldığını anlayabilmek için sınırlı sayıda uygulama içi kullanım olayı (ör. ekran görüntüleme, arama yapılması, ilan oluşturma adımları), **Patify'nin kendi Supabase altyapısında** kaydedilir. Bu kayıt yalnızca kullanıcının açık rızası alındıktan sonra ve hesabıyla ilişkilendirilerek yapılır; bu nedenle kişisel veri niteliğindedir ve KVKK m.5/1 uyarınca açık rızaya dayanır. Serbest metin, arama sorgusu, konum koordinatı veya cihaz tanımlayıcısı hiçbir zaman kaydedilmez — yalnızca önceden tanımlanmış, sınırlı bir değer kümesine sahip alanlar toplanır ve 90 gün sonunda silinir (bkz. Bölüm 4). Bu izni istediğiniz zaman **Ayarlar > Kullanım istatistikleri** üzerinden geri çekebilirsiniz; geri çekme işlemi hesabınıza bağlı ham kayıtları derhal siler.
- **Anonim ziyaretçi sayacı:** Oturum açmamış (misafir) kullanıcıların uygulamayı nasıl kullandığına dair yalnızca günlük, toplu bir sayaç tutulur (ör. belirli bir ekranın kaç kez görüntülendiği). Bu sayaçta **kullanıcı kimliği, cihaz tanımlayıcısı, oturum kimliği veya IP adresi bulunmaz** ve herhangi bir kişiyle ilişkilendirilemez.
- **OneSignal:** Push bildirimleri için cihaz düzeyinde `player_id` atanır. Bildirime abone olunması durumunda aktif olur; bildirimler devre dışı bırakıldığında temizlenir.

Üçüncü taraf reklamcılık veya yeniden hedefleme (retargeting) amacıyla herhangi bir izleyici kullanılmamaktadır.

---

## 9. Veri Güvenliği

Kişisel verilerinizin korunması için KVKK'nın 12. maddesi kapsamında aşağıdaki teknik ve idari tedbirler uygulanmaktadır:

- **Taşıma güvenliği:** Tüm istemci-sunucu iletişimi TLS (HTTPS/WSS) ile şifrelenir.
- **Erişim kontrolü:** Supabase Row Level Security (RLS) politikaları ile her kullanıcı yalnızca kendi verilerine erişebilir.
- **Parola güvenliği:** Parolalar düz metin olarak saklanmaz; güvenli hash algoritmaları kullanılır.
- **Hata izleme:** Sentry'e iletilen kilitlenme raporları hassas veri içermemeye özen gösterilerek yapılandırılmıştır.
- **Yetkilendirme:** Üretim veritabanına erişim yalnızca yetkili geliştiricilerle sınırlıdır.

Hiçbir sistem %100 güvenli değildir. Bir güvenlik açığı keşfederseniz lütfen **b.cihancengiz@gmail.com** adresinden bize bildirin.

---

## 10. Politika Değişiklikleri

Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler yapılması durumunda:

- Uygulama içinde bildirim gösterilecektir.
- Politikanın üst kısmındaki "Son Güncelleme" tarihi yenilenecektir.

Değişikliğin yürürlüğe girmesinden sonra uygulamayı kullanmaya devam etmeniz, güncellenmiş politikayı kabul ettiğiniz anlamına gelir. Değişiklikleri kabul etmiyorsanız hesabınızı silebilirsiniz.

---

## 11. Yürürlük Tarihi

Bu Gizlilik Politikası ilk olarak **23 Mayıs 2026** tarihinde yürürlüğe girmiş; **19 Temmuz 2026** tarihinde, Firebase Analytics'in kaldırılıp Patify'nin kendi altyapısında yürütülen, açık rızaya dayalı kullanım istatistikleri sistemiyle değiştirilmesini yansıtacak şekilde güncellenmiştir.

---

## 12. İletişim

Kişisel verilerinize ilişkin tüm sorularınız, talepleriniz veya şikâyetleriniz için:

**E-posta:** b.cihancengiz@gmail.com

KVKK kapsamındaki haklarınızı kullanmak için yukarıdaki adrese "KVKK Başvurusu" konusuyla e-posta gönderebilirsiniz. Talebinizde kimliğinizi doğrulayacak bilgileri (ad-soyad, kayıtlı e-posta adresi) eklemeniz yanıt sürecini hızlandıracaktır.

Başvurunuza 30 gün içinde yanıt verilmemesi halinde Kişisel Verileri Koruma Kurumu'na (KVKK) şikâyette bulunma hakkınız saklıdır.

