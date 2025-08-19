# Patify

Next.js 15 ve Supabase ile oluşturulmuş, Apple Sign-In entegrasyonu ve temiz, duyarlı tasarıma sahip modern bir kimlik doğrulama özellikli web uygulaması.

## ✨ Özellikler

- 🔐 **Tam Kimlik Doğrulama Sistemi** - Kayıt ol, giriş yap, çıkış yap, şifre sıfırlama
- 🍎 **Apple Sign-In Entegrasyonu** - Apple ile sorunsuz OAuth
- 🎨 **Modern Arayüz** - Tailwind CSS ve shadcn/ui bileşenleri ile oluşturulmuş
- 🌙 **Karanlık/Açık Mod** - next-themes ile tema değiştirme
- 📱 **Duyarlı Tasarım** - Mobil-öncelikli yaklaşım
- ⚡ **Hızlı Performans** - Turbopack ile Next.js 15
- 🔒 **Güvenli** - Supabase Auth ile çerez tabanlı oturumlar
- 🏗️ **Tip Güvenli** - Tam TypeScript desteği

## 🚀 Teknoloji Yığını

- **Framework**: [Next.js 15](https://nextjs.org/) App Router ile
- **Kimlik Doğrulama**: [Supabase Auth](https://supabase.com/auth)
- **Veritabanı**: [Supabase](https://supabase.com/)
- **Stil**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Bileşenleri**: [shadcn/ui](https://ui.shadcn.com/)
- **Tema**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Font**: [Geist](https://vercel.com/font)
- **Dil**: [TypeScript](https://www.typescriptlang.org/)

## 📋 Ön Koşullar

Başlamadan önce, aşağıdakilerin mevcut olduğundan emin olun:

- Node.js 18+ yüklü
- Bir [Supabase](https://supabase.com/) hesabı ve projesi
- Apple Developer hesabı (Apple Sign-In için)

## 🛠️ Kurulum

1. **Depoyu klonlayın**
   ```bash
   git clone https://github.com/yourusername/patify-nextjs.git
   cd patify-nextjs
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Ortam değişkenlerini ayarlayın**
   
   Kök dizinde bir `.env.local` dosyası oluşturun:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=supabase_proje_url_iniz
   NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase_anon_anahtariniz
   PUBLIC_URL=http://localhost:3000
   ```

4. **Supabase'i yapılandırın**
   - Yeni bir Supabase projesi oluşturun
   - Proje URL'nizi ve anon anahtarınızı ortam değişkenlerine kopyalayın
   - Supabase kontrol panelinizde kimlik doğrulama sağlayıcılarını ayarlayın

5. **Apple Sign-In'i yapılandırın** (İsteğe bağlı)
   - Apple Developer hesabınızda Apple Sign-In'i ayarlayın
   - Supabase'de OAuth sağlayıcısını yapılandırın
   - Gerekirse koddaki client ID'yi güncelleyin

## 🏃‍♂️ Kullanım

### Geliştirme

Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

### Üretim için Derleme

```bash
npm run build
npm start
```

## 📁 Proje Yapısı

```
patify-nextjs/
├── app/                          # Next.js App Router
│   ├── (auth-pages)/            # Authentication pages
│   │   ├── forgot-password/     # Password reset request
│   │   └── login/               # Login page
│   ├── auth/                    # Auth callbacks and errors
│   ├── home/                    # Protected home section
│   │   └── reset-password/      # Password reset form
│   ├── protected/               # Example protected route
│   ├── actions.ts               # Server actions for auth
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── components/                  # React components
│   ├── ui/                     # shadcn/ui components
│   ├── tutorial/               # Tutorial components
│   ├── header-auth.tsx         # Navigation auth state
│   └── ...                     # Other components
├── lib/                        # Utility libraries
│   └── supabase/              # Supabase client configurations
│       ├── client.ts          # Client-side client
│       ├── middleware.ts      # Middleware client
│       └── server.ts          # Server-side client
├── utils/                      # Utility functions
│   └── supabase/              # Supabase utilities
└── public/                     # Static assets
    └── .well-known/           # Apple app site association
```

## 🔐 Kimlik Doğrulama Akışı

Uygulama, çerez tabanlı oturumlarla Supabase Auth kullanır:

1. **Sunucu tarafı render** - Kimlik doğrulama durumu sunucuda kontrol edilir
2. **Middleware koruması** - Rotalar middleware aracılığıyla korunur
3. **Çoklu kimlik doğrulama sağlayıcıları** - E-posta/şifre ve Apple Sign-In
4. **Güvenli oturumlar** - Otomatik yenileme ile HTTPOnly çerezler

### Mevcut Kimlik Doğrulama İşlemleri

- `signUpAction` - Kullanıcı kaydı
- `signInAction` - Kullanıcı girişi
- `signOutAction` - Kullanıcı çıkışı
- `forgotPasswordAction` - Şifre sıfırlama isteği
- `resetPasswordAction` - Şifre güncelleme
- `signInWithAppleAction` - Apple OAuth akışı

## 🎨 Stil ve Tema

Uygulama şunları kullanır:

- **Tailwind CSS** - Yardımcı program öncelikli stil için
- **shadcn/ui** - Tutarlı, erişilebilir bileşenler için
- **CSS değişkenleri** - Tema için (açık/karanlık mod)
- **Geist font** - Modern tipografi için

### Tema Değiştirme

Karanlık ve açık temalar, navigasyondaki tema değiştirici aracılığıyla kullanılabilir.

## 🔒 Güvenlik Özellikleri

- Oturum yönetimi için HTTPOnly çerezler
- Supabase aracılığıyla CSRF koruması
- Güvenli şifre sıfırlama akışı
- Apple ile OAuth entegrasyonu
- Ortam değişkeni doğrulaması
- Korumalı rota middleware'i

## 🚀 Dağıtım

### Vercel (Önerilen)

1. GitHub deponuzu Vercel'e bağlayın
2. Vercel kontrol panelinde ortam değişkenlerini ayarlayın
3. Ana dala push yapıldığında otomatik olarak dağıtın

### Diğer Platformlar

Dağıtım platformunuzun şunları desteklediğinden emin olun:
- Node.js 18+
- Ortam değişkenleri
- Statik dosya sunma

## 🤝 Katkıda Bulunma

Katkılar memnuniyetle karşılanır! Rehber için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakın.

## 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

## 🆘 Destek

Herhangi bir sorunla karşılaşırsanız veya sorularınız varsa:

1. [Issues](https://github.com/yourusername/patify-nextjs/issues) sayfasını kontrol edin
2. Ayrıntılı bilgilerle yeni bir sorun oluşturun
3. Topluluk tartışmalarımıza katılın

## 🙏 Teşekkürler

- Harika framework için [Next.js](https://nextjs.org/) ekibi
- Backend altyapısı için [Supabase](https://supabase.com/)
- Güzel UI bileşenleri için [shadcn](https://twitter.com/shadcn)
- Barındırma ve dağıtım için [Vercel](https://vercel.com/)

---

Patify ekibi tarafından ❤️ ile oluşturulmuştur
