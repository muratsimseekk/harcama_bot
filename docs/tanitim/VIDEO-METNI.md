# Paraİzi tanıtım videosu: metin paketi

Video: `tanitim-video/out/paraizi-tanitim.mp4`. Boyut 1080×1920 (dikey, hikâye/Reels), süre 46,5 sn, 30 fps.
Kaynak kod: `tanitim-video/` (Remotion). Yeniden üretmek için `tanitim-video/README.md`'ye bak.

> Hane ve Excel/PDF **Pro** özellikleridir. Videoda bu sahnelerde "PRO" rozeti var.
> Videoda "Limit" sahnesindeki Hedefler ekranı ve LİMİT rozeti build 11 görünümüdür. Özelliğin kendisi build 10'da da var.

---

## 1. Sahne akışı ve seslendirme metni

Seslendirme isteğe bağlı. Süreler ekrandaki animasyonla eşleşir; her satır okunduğunda kendi sahnesine sığar
(yaklaşık 2,5 kelime/sn).

| Sn | Sahne | Ekranda | Seslendirme |
|---|---|---|---|
| 0,0 | Kanca | **Maaş yattı… ve yine bitti?** / Peki nereye gitti? | "Maaş yattı… ve yine bitti? Peki nereye gitti?" |
| 2,5 | Marka | **Paraİzi**, sesli harcama takibi | "Tanış: Paraİzi." |
| 4,3 | Sesle kayıt | **Söyle, kaydetsin.** "Market 850, dün benzin 1200" → 2 kayıt bulundu | "Harcamanı söylemen yeter: 'Market sekiz yüz elli, dün benzin bin iki yüz.' Gerisini o halleder." |
| 9,3 | Yapay zeka | **Kategoriyi yapay zeka bulur.** kahve → Kafe, benzin → Ulaşım, maaş → Gelir, altın → Yatırım | "Yapay zeka kategoriyi bulur; sen sadece onayla." |
| 13,4 | Gelir & gider | **Gelir, gider, hepsi tek yerde.** Kalan tutar; Kişisel / İşletme / Yatırım | "Gelir, gider, kalan: hepsi tek yerde." |
| 17,1 | Kategoriler | **Paran nereye gidiyor?** Kategori çubukları | "Paranın nereye gittiğini tek bakışta gör." |
| 20,5 | Limit | **Limit koy, aşmadan haber al.** %89 + "%97'si doldu" bildirimi | "Limit koy; sınıra yaklaşınca haber versin." |
| 24,2 | Hedef | **Birikimin hedefe bağlı.** Aylık yatırım hedefi, hisse/kripto/altın | "Her yatırımına bir hedef koy, ilerlemeni izle." |
| 28,0 | Sabit gider | **Kira, fatura, maaş: kendiliğinden.** | "Kira, fatura, maaş… her ay kendiliğinden eklensin." |
| 31,6 | Excel / PDF | **Excel ve PDF, tek dokunuşla.** (Pro) | "Excel ya da PDF dökümün tek dokunuşla hazır." |
| 34,9 | Hane | **Evin bütçesi, birlikte.** Katılım kodu, üyeler, ortak toplam (Pro) | "Haneni kur, evin bütçesini birlikte yönet." |
| 38,5 | Güven | **Bankana bağlanmaz. Verin sende kalır.** | "Bankana bağlanmaz. Verin sende kalır." |
| 41,5 | Kapanış | **Paraİzi. Söyle. Kaydet. Gör.** Google Play'de ücretsiz | "Paraİzi. Söyle, kaydet, gör. Google Play'de ücretsiz." |

Tek parça seslendirme metni (kopyala-yapıştır):

```
Maaş yattı… ve yine bitti? Peki nereye gitti?
Tanış: Paraİzi.
Harcamanı söylemen yeter: "Market sekiz yüz elli, dün benzin bin iki yüz." Gerisini o halleder.
Yapay zeka kategoriyi bulur; sen sadece onayla.
Gelir, gider, kalan: hepsi tek yerde.
Paranın nereye gittiğini tek bakışta gör.
Limit koy; sınıra yaklaşınca haber versin.
Her yatırımına bir hedef koy, ilerlemeni izle.
Kira, fatura, maaş… her ay kendiliğinden eklensin.
Excel ya da PDF dökümün tek dokunuşla hazır.
Haneni kur, evin bütçesini birlikte yönet.
Bankana bağlanmaz. Verin sende kalır.
Paraİzi. Söyle, kaydet, gör. Google Play'de ücretsiz.
```

---

## 2. Yapay zeka seslendirme promptu

ElevenLabs, CapCut "Metinden sese" gibi bir araçta:

```
Türkçe, doğal ve sıcak bir ses; 25–35 yaş arası, samimi ve güven veren bir ton.
Reklam spikeri gibi bağırmasın, bir arkadaşına güzel bir uygulama öneriyormuş gibi konuşsun.
Tempo canlı ama anlaşılır (dakikada ~150 kelime). İlk cümlede hafif şakacı bir sitem,
"Tanış: Paraİzi." cümlesinde kısa bir duraklama ve gülümseme. Sayıları açıkça oku
("sekiz yüz elli", "bin iki yüz"). Son cümle net ve kendinden emin bitsin.
Toplam süre 45 saniyeyi geçmesin.
```

Ses dosyasını `tanitim-video/public/ses.mp3` olarak koyarsan videoya gömülür (README'ye bak).

---

## 3. Müzik

Videonun içinde müzik yok.
- **En kolayı:** Instagram/Facebook'ta paylaşırken uygulamanın kendi **Müzik** çıkartmasını kullan. Telif sorunu çıkmaz.
- Videoya gömmek istersen telifsiz bir parça seç (YouTube Ses Kitaplığı, Pixabay Music) ve `tanitim-video/public/muzik.mp3` olarak koy.
- Yapay zekayla üretmek için (Suno, Udio vb.; ticari kullanım hakkını aracın şartlarından kontrol et):

```
Upbeat modern minimal pop, 118 BPM, no vocals. Clean plucked synths, soft claps, warm bass,
optimistic and friendly fintech-app vibe. Short tense intro (0–2 s), lift at 2.5 s
when the logo appears, steady groove until 41 s, then a bright final hit and clean ending
at 46 s. Total length 47 seconds.
```

Arama kelimeleri: *"upbeat corporate pop no vocals"*, *"minimal tech promo"*, *"happy ukulele claps"*.

---

## 4. Paylaşım metinleri

**Instagram / Facebook gönderisi (Reels açıklaması):**

```
Maaş yattı… ve yine bitti mi? 😅

Paraİzi ile harcamanı yazmana bile gerek yok, söylemen yeter:
🎙️ "Market 850, dün benzin 1200" → 2 kayıt hazır
🤖 Kategoriyi yapay zeka bulur
📊 Gelir, gider, kalan: tek bakışta
🚦 Limit koy, sınıra yaklaşınca haber al
🎯 Hisse, altın, kripto için yatırım hedefleri
🔁 Kira, fatura, maaş her ay kendiliğinden
📄 Excel/PDF döküm ve 🏠 hane bütçesi (Pro)
🔒 Bankana bağlanmaz, verin sende kalır

Google Play'de ücretsiz, "Paraİzi" diye ara 👇
https://play.google.com/store/apps/details?id=com.paraizi.app

#paraizi #bütçe #harcamatakibi #birikim #kişiselfinans #tasarruf #yatırım #yapayzeka
```

**WhatsApp durumu (kısa):**

```
Harcamalarımı artık söyleyerek kaydediyorum 🎙️ Paraİzi, Google Play'de ücretsiz:
https://play.google.com/store/apps/details?id=com.paraizi.app
```

**Hikâye üstüne tek satırlık yazı önerileri:**
- "Ay sonunu görmek isteyenlere 👇"
- "Harcamanı söyle, gerisini o halletsin."
- "Bankana bağlanmayan bütçe uygulaması 🔒"

> Hikâyede link tıklanmaz. Instagram/Facebook'ta **Bağlantı çıkartması** ekleyip Play linkini koy.
