# Liste sitesi
PowerShell'de bu klasörde npm.cmd install ve ardından npm.cmd run dev çalıştırın.
Tarayıcıda http://localhost:3000 adresini açın.
Şehirler, örnek firma profili, blog, iletişim ve şikâyet ekranları önizleme verileri kullanır.

## Yönetim paneli (yerel)
1. `.env.example` dosyasını `.env.local` olarak kopyalayın ve `ADMIN_PASSWORD` değerine en az 12 karakterlik bir şifre yazın.
2. Sunucuyu (yeniden) başlatın ve http://localhost:3000/admin adresini açın.
3. Firma ekleyin: taslak için yalnızca firma adı gerekir. Yayınlamak için ad, şehir (81 ilden biri), telefon, e-posta ve adres zorunludur; WhatsApp ve web sitesi isteğe bağlıdır.
4. Yayındaki firmalar kendi şehirlerinin sayfasında listelenir (ör. http://localhost:3000/firmalar/ankara, /firmalar/istanbul); "Yayından kaldır" ile taslağa dönerler. Şehir listesi `lib/cities.ts` dosyasındadır; bilinmeyen şehir adresleri 404 döner.

### Giriş denemesi sınırı
- Son 15 dakika içinde (kayan pencere) 5 hatalı şifre girilirse o istemci 15 dakika kilitlenir. Başarılı giriş sayacı sıfırlar.
- Sayaçlar sunucu belleğinde tutulur: sunucu yeniden başlayınca sıfırlanır ve birden fazla sunucu örneği arasında paylaşılmaz.
- **Varsayılan (`ADMIN_TRUSTED_PROXY_HOPS` boş/0):** `X-Forwarded-For` gibi başlıklara güvenilmez, çünkü Next.js bu başlığı yalnızca istemci göndermemişse doldurur; doğrudan erişimde istemci istediğini yazabilir. Bu modda tüm denemeler **tek ortak sayacı** paylaşır: yerel önizlemede sorunsuzdur, ancak internete açık bir sunucuda başkası 5 hatalı deneme ile paneli herkes için 15 dakika kilitleyebilir.
- **Güvenilir proxy sınırı (`ADMIN_TRUSTED_PROXY_HOPS=N`, 1–10):** Uygulamanın önünde N adet ters proxy varsa, her istemci kendi sayacını alır. İstemci adresi `X-Forwarded-For` listesinin sağdan N'inci girdisidir; daha soldaki girdiler istemcinin yazabileceği değerlerdir ve yok sayılır. Koşullar:
  1. Uygulama portu yalnızca bu proxy'lerden erişilebilir olmalı (ör. `127.0.0.1`'e bağlama veya güvenlik duvarı). Aksi halde saldırgan proxy'yi atlayıp başlığı serbestçe yazar.
  2. Her proxy, bağlantıyı aldığı adresi başlığa **eklemeli** (nginx: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`), istemcinin gönderdiğiyle değiştirmemelidir.
  3. N tam olarak proxy sayısı olmalı; fazlası saldırganın yazdığı girdiyi seçer, eksiği proxy adresini seçer (herkes tek sayaçta toplanır).
- IPv6 istemciler /64 önekine göre gruplanır. En fazla 5000 istemci sayacı tutulur; süresi dolanlar temizlenir, tablo doluysa yeni istemciler ortak bir taşma sayacını paylaşır.

Veriler Node'un yerleşik SQLite modülüyle (`node:sqlite`, Node 22.13+ / 23.4+) `data/liste.sqlite` dosyasında tutulur.
Bu dosyayı yedeklemek için sunucu kapalıyken kopyalamanız yeterlidir.
