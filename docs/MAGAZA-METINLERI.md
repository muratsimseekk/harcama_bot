# Paraİzi — Google Play mağaza metinleri ve form cevapları

> Play Console'a kopyala-yapıştır için. Uygulama değişirse burayı güncelle.
> Hazırlandı: 2026-10-09 · Bkz. `GOOGLE-PLAY-REHBERI.md` Aşama 3

---

## Geliştirici / iletişim bilgileri (Play Console → Ayarlar → Geliştirici hesabı + Mağaza ayarları)

| Alan | Değer |
|---|---|
| Geliştirici adı (mağazada görünür) | **nimustudio** |
| İletişim e-postası (herkese açık) | **info@nimustudio.com** |
| Web sitesi | **https://nimustudio.com** |
| Telefon (isteğe bağlı) | boş bırak |
| Gizlilik politikası | **https://nimustudio.com/paraizi/gizlilik** |
| Hesap silme bağlantısı (Veri güvenliği) | **https://nimustudio.com/paraizi/hesap-silme** |
| Hesap sahibi (Google'a, gizli) | Murat Şimşek · Şehitkamil / Gaziantep · muratsimsek@nimustudio.com |

> Bireysel hesapta Google, adresini mağazada gösterebilir (ör. ödeme alan geliştiricilerde).
> Ev adresi görünsün istemezsen şimdilik il/ilçe düzeyinde bırak.

---

## Ana mağaza girişi (Grow → Store presence → Main store listing) · dil: Türkçe

**Uygulama adı** (≤30): `Paraİzi: Harcama Takibi` (23 karakter)

**Kısa açıklama** (≤80):
```
Harcamanı yaz ya da söyle, yapay zeka kaydetsin. Bütçe ve analiz tek yerde.
```

**Uzun açıklama** (≤4000):
```
Paraİzi, harcamalarını ve gelirlerini saniyeler içinde kaydetmen ve paranın nereye gittiğini net olarak görmen için tasarlanmış bir kişisel bütçe uygulamasıdır.

YAZ YA DA SÖYLE, GERİSİ HALLOLSUN
"Market 250, dün benzin 600" yaz ya da sesli söyle. Paraİzi tutarı, kategoriyi ve tarihi kendisi çıkarır; sen sadece kontrol edip onaylarsın. Tek mesajda birden fazla işlem girebilirsin. İstersen klasik formla elle de ekleyebilirsin.

BÜTÇE VE HEDEFLER
• Aylık toplam harcama sınırı ve kategori bazlı bütçeler koy
• Sınıra yaklaşınca bildirim al
• Birikim hedeflerini takip et

ANALİZ VE ÖZETLER
• Haftalık, aylık ve yıllık grafikler
• Kategori dağılımı ve en çok harcadığın alanlar
• Geçmiş işlemlerinde arama ve filtreleme

KİŞİSEL, İŞLETME VE YATIRIM AYRI
Kendi işin varsa işletme giderlerini kişisel harcamalarından ayrı tut. Yatırım hareketlerini de ayrı bir başlıkta izle. Kategorileri dilediğin gibi düzenle.

HANE / AİLE PAYLAŞIMI (Pro)
Eşin ya da ailenle ortak bir hane oluştur, harcamaları birlikte takip edin.

ÜCRETSİZ VE PRO
• Ücretsiz: Her gün belirli sayıda kayıt hakkı. Hakkın bitince isteğe bağlı kısa bir ödüllü video izleyerek ek hak kazanabilirsin.
• Pro: Sınırsız kayıt, reklamsız kullanım ve hane paylaşımı. Aylık veya yıllık abonelik; Google Play hesabından istediğin zaman iptal edebilirsin.

GİZLİLİK
• Paraİzi hiçbir bankaya veya kartına bağlanmaz; kayıtlar yalnızca senin girdiğin bilgilerdir.
• Sesli kayıtların yalnızca metne çevrilmek için işlenir ve saklanmaz.
• Verilerini satmayız. Hesabını ve tüm verilerini uygulama içinden tek dokunuşla silebilirsin.

Paraİzi bir bankacılık veya yatırım danışmanlığı hizmeti değildir; sunduğu özetler bilgilendirme amaçlıdır.

Soru ve önerilerin için: info@nimustudio.com
```

**Kategori:** Finans · **Etiketler:** Bütçe, Harcama takibi, Kişisel finans (Play'in listesinden en yakınları)

**Görseller:** ikon 512×512 · feature graphic 1024×500 · telefon ekran görüntüleri 4-6 adet
(→ rehber 2.1 / 3.4)

---

## Uygulama erişimi (Policy → App content → App access)

Seçim: **"Uygulamadaki işlevlerin tümü veya bir kısmı kısıtlanmış"** → talimat ekle:

| Alan | Değer |
|---|---|
| Talimat adı | Demo hesap |
| Kullanıcı adı / e-posta | `demo@nimustudio.com` *(rehber 2.6'da oluşturulacak)* |
| Şifre | *(demo hesabı açınca yaz)* |
| Diğer bilgiler | aşağıdaki metin |

```
Giriş ekranında yukarıdaki e-posta ve şifreyi girip "Giriş Yap"a dokunun. Hesapta örnek işlemler, bir bütçe ve bir hedef hazırdır.
- İşlem eklemek için alt menünün ortasındaki Ekle sekmesi: yazarak ("kahve 90") veya mikrofon ile sesli ekleme.
- Ücretsiz katmanda günlük kayıt hakkı bitince isteğe bağlı ödüllü reklam izlenerek ek hak kazanılır.
- Pro abonelik: Profil > Üyelik (Google Play Billing).
- Destek: Profil > Ayarlar > Bize Yaz. Hesap silme: Profil > Ayarlar > Hesabı Sil.
Not: Sunucu ilk istekte birkaç saniye geç yanıt verebilir.
```

---

## Reklamlar (App content → Ads)
**Evet, uygulamam reklam içeriyor.** (Yalnız kullanıcının kendi başlattığı ödüllü video — Google AdMob.)

## Reklam kimliği (App content → Advertising ID)
**Evet** → Kullanım amacı: **Reklam veya pazarlama**. (AdMob SDK, `AD_ID` izni manifest'te.)

## Hedef kitle ve içerik (Target audience)
Yaş grubu: **18 ve üzeri** · Çocuklara hitap ediyor mu: **Hayır**

## İçerik derecelendirmesi (IARC anketi)
- E-posta: info@nimustudio.com · Kategori: **"Diğer tüm uygulama türleri"** (oyun değil)
- Şiddet, cinsellik, küfür, uyuşturucu, kumar, korku: **Hayır**
- Kullanıcılar birbiriyle iletişim kuruyor / içerik paylaşıyor mu: **Hayır**
  (hane paylaşımı yalnız davet edilen kişiler arasında işlem görme; mesajlaşma yok)
- Kullanıcının konumunu paylaşıyor mu: **Hayır** · Dijital ürün satın alımı: **Evet** (abonelik)
- Beklenen sonuç: **3+ / PEGI 3 / Genel**

## Finansal özellikler beyanı (App content → Financial features)
Paraİzi; banka hesabı, kredi, ödeme, para transferi, yatırım işlemi, kripto alım-satımı
**sunmaz**. Kişisel bütçe/harcama kaydı tutar. → "Uygulamam bu finansal özelliklerin hiçbirini
sunmuyor" (formda "kişisel finans yönetimi/bütçe" seçeneği varsa onu işaretle).

## Diğer beyanlar
Devlet uygulaması: Hayır · Sağlık: Hayır · Haber: Hayır · COVID-19: Hayır ·
Veri güvenliği: `GOOGLE-PLAY-REHBERI.md` §3.3 tablosu

---

## Production erişimi başvurusu (14 günlük kapalı testten sonra) — taslak cevaplar
- **Test kullanıcılarını nasıl buldun?** Arkadaş, aile ve iş çevresinden Android kullanan gönüllüler.
- **Test sırasında neleri denediler?** Kayıt/giriş (e-posta ve Google), yazılı ve sesli işlem
  ekleme, bütçe ve hedefler, analiz grafikleri, ödüllü reklam ve Pro abonelik akışı.
- **Geri bildirim ve değişiklikler:** *(test sürecinde gelenleri buraya not al)*
- **Hedef kitle:** Harcamalarını hızlıca kaydetmek isteyen Türkiye'deki yetişkin kullanıcılar ve küçük işletme sahipleri.
- **Uygulamanın değeri:** Yazarak veya konuşarak saniyeler içinde kayıt; banka bağlantısı gerektirmeyen gizlilik odaklı bütçe takibi.
