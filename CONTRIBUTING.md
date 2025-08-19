# Patify'a Katkıda Bulunma

Patify'a katkıda bulunma ilginiz için teşekkür ederiz! Topluluktan gelen katkıları memnuniyetle karşılıyoruz ve projeye neler getireceğinizi görmek için heyecanlıyız.

## 🚀 Başlarken

### Ön Koşullar

- Node.js 18+ 
- npm veya yarn
- Git
- Bir Supabase hesabı (kimlik doğrulama özelliklerini test etmek için)

### Geliştirme Kurulumu

1. **Depoyu fork edin ve klonlayın**
   ```bash
   git clone https://github.com/yourusername/patify-nextjs.git
   cd patify-nextjs
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Ortam değişkenlerini ayarlayın**
   ```bash
   cp .env.example .env.local
   # Supabase kimlik bilgilerinizi ekleyin
   ```

4. **Geliştirme sunucusunu başlatın**
   ```bash
   npm run dev
   ```

## 📝 Nasıl Katkıda Bulunulur

### Sorun Bildirme

Bir sorun oluşturmadan önce, lütfen:

1. **Mevcut sorunları arayın** - tekrarlardan kaçınmak için
2. **Sorun şablonunu kullanın** - mevcut olduğunda
3. **Ayrıntılı bilgi sağlayın**:
   - Yeniden üretme adımları
   - Beklenen ve gerçek davranış
   - Uygulanabilir ise ekran görüntüleri/videolar
   - Çevre ayrıntıları (OS, tarayıcı, Node sürümü)

### Özellik Önerme

Özellik önerilerinizi seviyoruz! Lütfen:

1. **Mevcut özellik isteklerini kontrol edin** - önce
2. **Büyük özellikler üzerinde çalışmaya başlamadan önce bir tartışma açın**
3. **Kullanım durumunu açıklayın** ve kullanıcılara nasıl fayda sağladığını
4. **Kapsamı düşünün** - küçük, odaklı özellikler incelemesi daha kolay

### Kod Katkıları

#### Başlamadan Önce

1. **Mevcut sorunları ve PR'ları kontrol edin** - tekrar iş yapmaktan kaçınmak için
2. **Büyük değişiklikleri önce bir sorunda tartışın**
3. **Testlerin yerel olarak geçtiğinden emin olun**
4. **Kodlama standartlarımızı takip edin**

#### Pull Request Süreci

1. **Bir özellik dalı oluşturun**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Değişikliklerinizi yapın**
   - Net, öz commit mesajları yazın
   - Mevcut kod stili ve desenlerini takip edin
   - Yeni işlevsellik için testler ekleyin
   - Gerekirse dokümantasyonu güncelleyin

3. **Değişikliklerinizi test edin**
   ```bash
   npm run build
   npm run lint
   npm run type-check
   ```

4. **Pull request oluşturun**
   - PR şablonunu kullanın
   - İlgili sorunları bağlayın
   - Değişikliklerin net açıklamasını sağlayın
   - UI değişiklikleri için ekran görüntüleri ekleyin

## 📋 Geliştirme Rehberleri

### Kod Stili

- **TypeScript**: Tüm yeni kod için TypeScript kullanın
- **ESLint**: Mevcut ESLint yapılandırmasını takip edin
- **Prettier**: Kod otomatik olarak biçimlendirilir
- **İsimlendirme**: Açıklayıcı, camelCase değişken isimleri kullanın
- **Yorumlar**: Fonksiyonlar ve karmaşık mantık için JSDoc yorumları ekleyin

### Bileşen Rehberleri

- **Dosya yapısı**: `/components` içindeki mevcut desenleri takip edin
- **Props**: Tüm bileşen props'ları için TypeScript arayüzleri tanımlayın
- **Erişilebilirlik**: Bileşenlerin erişilebilir olduğundan emin olun (WCAG 2.1 AA)
- **Duyarlı**: Tüm arayüz mobil ve masaüstünde çalışmalı
- **shadcn/ui**: Mümkün olduğunda mevcut bileşenleri kullanın

### Kimlik Doğrulama ve Güvenlik

- **Asla gizli bilgileri veya API anahtarlarını commit etmeyin**
- **Kimlik doğrulama ile ilgili kod için Supabase desenlerini takip edin**
- **Sunucu eylemleri**: Kimlik doğrulama işlemleri için sunucu eylemlerini kullanın
- **Doğrulama**: Tüm kullanıcı girdilerini doğrulayın
- **Hata yönetimi**: Anlamlı hata mesajları sağlayın

### Test Etme

- **Birim testleri**: Yardımcı fonksiyonlar için testler yazın
- **Bileşen testleri**: Bileşen davranışını ve erişilebilirliğini test edin
- **Entegrasyon testleri**: Kimlik doğrulama akışlarını ve kritik yolları test edin
- **Manuel test**: Farklı tarayıcı ve cihazlarda test edin

## 🎯 Katkı Alanları

Özellikle şu alanlarda katkıları memnuniyetle karşılıyoruz:

### 🐛 Hata Düzeltmeleri
- Kimlik doğrulama uç durumları
- UI/UX iyileştirmeleri
- Performans optimizasyonları
- Erişilebilirlik iyileştirmeleri

### ✨ Özellik Geliştirmeleri
- Ek OAuth sağlayıcıları
- Kullanıcı profili yönetimi
- E-posta şablonları özelleştirmesi
- Mobil uygulama entegrasyonu
- Yönetici paneli özellikleri

### 📚 Dokümantasyon
- API dokümantasyonu
- Eğitim iyileştirmeleri
- Kod örnekleri
- Çeviri/yerelelleştirme

### 🧪 Test Etme
- Birim test kapsamı
- Uçtan uca test senaryoları
- Performans testi
- Çapraz tarayıcı testi

## 🔄 Geliştirme İş Akışı

### Dal İsimlendirme
- `feature/aciklama` - Yeni özellikler
- `fix/aciklama` - Hata düzeltmeleri
- `docs/aciklama` - Dokümantasyon güncellemeleri
- `chore/aciklama` - Bakım görevleri

### Commit Mesajları
Geleneksel commit'leri kullanın:
```
feat: Apple Sign-In entegrasyonu eklendi
fix: kimlik doğrulama yönlendirme döngüsü çözüldü
docs: kurulum talimatları güncellendi
chore: bağımlılıklar güncellendi
```

### Kod İnceleme Süreci

1. **Otomatik kontroller** geçmeli (CI/CD, linting, testler)
2. **Maintainer'lardan eş değerlendirmesi**
3. **Farklı ortamlarda test etme**
4. **Onaylandığında birleştirme**

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to docs
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested

## 💬 İletişim

- **GitHub Issues**: Hatalar ve özellik istekleri için
- **GitHub Discussions**: Sorular ve genel tartışma için
- **Pull Requests**: Kod incelemesi ve tartışma için

## 📄 Lisans

Patify'a katkıda bulunarak, katkılarınızın MIT Lisansı altında lisanslanacağını kabul etmiş olursunuz.

## 🙏 Tanınma

Katkıda bulunanlar şunlarda tanınacaktır:
- README.md katkıda bulunanlar bölümü
- Önemli katkılar için sürüm notları
- İlk kez katkıda bulunanlar için özel bahisler

---

Patify'a katkıda bulunduğunuz için teşekkür ederiz! 🎉