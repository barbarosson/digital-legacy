# Dijital Miras

Kişisel dijital miras planlayıcısı. Dijital varlıklarınızı, mirasçılarınızı ve sevdiklerinize bırakmak istediğiniz mesajları yönetmenizi sağlar.

**Tamamen lokal çalışır** — veriler `data/dijital-miras.db` SQLite dosyasında saklanır. Bulut, Supabase veya dış servis bağlantısı yoktur.

## Başlangıç

```bash
cd dijital-miras
npm install
npm run dev
```

Uygulama [http://localhost:3002](http://localhost:3002) adresinde açılır.

## Masaüstü uygulaması (Electron)

Geliştirme modunda pencere içinde çalıştırmak için:

```bash
npm run electron:dev
```

Kurulabilir Windows paketi (.exe) oluşturmak için:

```bash
npm install
npm run electron:build
```

Çıktı `release/` klasöründedir. Kurulum sonrası veriler tarayıcı yerine Windows kullanıcı profilinizde saklanır (`%APPDATA%/dijital-miras/data`).

## Özellikler

- **PIN koruması** — panel ve API'ler PIN ile korunur (ilk girişte PIN oluşturulur)
- **Alan şifreleme** — varlık detayları, mesaj içerikleri, notlar ve konum AES-256-GCM ile şifrelenir
- **Yedekleme** — veritabanını `.db` dosyası olarak indirme ve geri yükleme
- **GDPR dışa aktarma** — tüm veriler + ham videolar tek bir `.zip` arşivi olarak indirilebilir
- **Takvim** — günlük video ve anı kayıtları, ruh hali (emoji), konum, video küçük resmi, mirasçıya bırakma
- **Akış** — video günlüklerini dikey kaydırmalı (Reels tarzı) izleme
- **Arama** — tarih, konum, ruh hali ve metne göre gelişmiş filtreleme (şifreli içerikte de arar)
- **Teslim** — hareketsizlik sonrası otomatik, manuel ve anlık mesaj teslimi + kademeli uyarı fazı
- **Hatırlatıcı** — masaüstü uygulamasında belirlenen saatte günlük bildirim
- **Genel Bakış** — miras planı özeti
- **Dijital Varlıklar** — hesaplar, belgeler, şifreler, talimatlar
- **Mirasçılar** — varlık ve mesaj alıcıları + gruplar ve çoklu atama
- **Mesajlar** — kişisel mektuplar ve talimatlar

## Teknoloji

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- SQLite + Drizzle ORM (lokal veritabanı)

## Veritabanı

İlk çalıştırmada `data/` klasörü ve veritabanı otomatik oluşturulur. Migration dosyaları `drizzle/` altındadır.

```bash
npm run db:generate   # şema değişikliği sonrası migration üret
npm run db:migrate    # migration'ları uygula
npm run db:backup     # manuel yedek oluştur (data/backups/)
npm run db:studio     # Drizzle Studio (veritabanı görüntüleme)
```

## Not

Bu proje workspace içindeki diğer uygulamalardan (`ai-suite`, ana Next.js projesi vb.) tamamen bağımsızdır.
