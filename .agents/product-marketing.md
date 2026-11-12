# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-11-12

> Paraİzi'nin pazarlama bağlamı. `.claude/skills/` altındaki pazarlama skill'leri (aso, paywalls,
> onboarding, analytics …) işe başlamadan önce bunu okur. Kod deposundan ve
> `docs/MAGAZA-METINLERI.md`'den taslaklandı. **Müşteri dili ve kanıt bölümleri yayından sonra
> gerçek yorumlarla doldurulmalı.**

## Product Overview
**One-liner:** Harcamanı söyle, yapay zeka kaydetsin: sesle ya da yazıyla saniyeler içinde gelir-gider ve bütçe takibi.
**What it does:** Kullanıcı "market 850, dün benzin 1200, kahve 95" der ya da yazar; yapay zeka tutarı, kategoriyi ve tarihi çıkarır, kullanıcı tek dokunuşla onaylar. Üstüne analiz (dönem/kategori kıyası, trend), kategori başına limit ya da hedef, yatırım hedefleri, tekrarlayan kayıtlar, aile (hane) paylaşımı, Excel/PDF dökümü ve TCMB kuruyla dolar/euro gösterimi.
**Product category:** Kişisel finans → harcama takibi / bütçe uygulaması (Play: Finans).
**Product type:** Mobil uygulama (Android yayında; iOS sonra), Türkçe, B2C.
**Business model:** Freemium.
- Free: günde 3 kayıt hakkı (elle + AI), isteğe bağlı ödüllü reklamla +1 hak; analiz, limit/hedef ve özetler ücretsiz; 3 tekrarlayan kural.
- Pro: ₺49,99/ay ya da ₺399,99/yıl (%33 indirim). Sınırsız kayıt, reklamsız kullanım, hane paylaşımı, Excel/PDF dökümü, sınırsız tekrarlayan kayıt. Deneme süresi yok.

## Target Audience
**Target users:** Türkiye'de yaşayan, akıllı telefonu yoğun kullanan 22–45 yaş yetişkinler; enflasyon ortamında harcamasını kontrol etmek isteyenler. İkincil kitle: kişisel ve işletme masrafını ayrı tutmak isteyen küçük işletme sahipleri ve serbest çalışanlar, ev bütçesini birlikte tutan çiftler.
**Decision-makers:** Kullanıcının kendisi (B2C). Hane özelliğinde bir kişi Pro alıp ötekini davet eder.
**Primary use case:** Harcamayı yaptığı anda, uğraşmadan kaydetmek ve ay sonunda paranın nereye gittiğini görmek.
**Jobs to be done:**
- "Harcamamı unutmadan, 5 saniyede kaydet."
- "Ay ortasında bütçemin neresinde olduğumu söyle; sınırı aşmadan uyar."
- "Birikim/yatırım hedefime ne kadar yaklaştığımı göster."
**Use cases:**
- Market/benzin/kahve çıkışında sesle tek cümlede birden fazla kayıt
- Kira, fatura, abonelik gibi sabit giderleri tekrarlayan kayıtla otomatik ekleme
- Eşle ortak hane bütçesi
- Esnaf/serbest çalışan: işletme giderini kişisel harcamadan ayırma; muhasebeciye Excel dökümü
- Aylık yatırım (altın, döviz, borsa) hedefi takibi

## Personas
B2C: tek karar verici. Pratik ayrım:
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Bütçesini toparlamak isteyen çalışan | Ay sonunu getirmek | Kayıt tutmayı 3. günde bırakıyor | Sesle 5 saniyede kayıt, limit uyarıları |
| Esnaf / serbest çalışan | İşletme ve kişisel parayı ayırmak | Fişler birikiyor, Excel'e geçmek zaman alıyor | İşletme bölümü + Excel/PDF dökümü |
| Ev bütçesini paylaşan çift | Ortak görünürlük | Kim ne harcadı belli değil | Hane paylaşımı (Pro) |
| Birikim yapan genç | Yatırım hedefi | Hedefe ne kadar kaldığını bilmiyor | Yatırım hedefleri, hedef kategorileri |

## Problems & Pain Points
**Core problem:** Harcama takibi sıkıcı; elle form doldurmak alışkanlığa dönüşmüyor, kullanıcı birkaç gün sonra bırakıyor.
**Why alternatives fall short:**
- Klasik takip uygulamaları: her kayıt için form (tutar, kategori, tarih) → sürtünme
- Banka uygulamaları: yalnız o bankanın kartını görür, nakit ve diğer kartlar yok; kategori kaba
- Excel/not defteri: disiplin ister, analiz yok
- Banka bağlantılı uygulamalar: hesap/kart bilgisi istemesi güven kaygısı yaratıyor
**What it costs them:** Ay sonunda "para nereye gitti?" belirsizliği, aşılan bütçe, ertelenen birikim.
**Emotional tension:** Kontrolü kaybetmiş hissi, enflasyon kaygısı, eşler arası "kim harcadı" gerginliği.

## Competitive Landscape
> Rakip özellikleri burada doğrulanmadı; ASO karşılaştırması yapılırken mağaza sayfalarından kontrol edilmeli.
**Direct:** Elle girişli harcama takip uygulamaları (ör. Money Manager, Monefy, Spendee, Wallet) — kayıt elle ve form üzerinden; Türkçe doğal dil ve sesle çoklu kayıt odakları değil.
**Secondary:** Banka uygulamalarının harcama analizi — tek bankaya bağlı, nakit/diğer kartlar yok.
**Indirect:** Excel, not defteri, hiç takip etmemek.

## Differentiation
**Key differentiators:**
- Türkçe doğal dille, sesle ya da yazıyla tek cümlede birden fazla kayıt ("dün", "3 Mayıs" gibi tarihleri anlar)
- Kaydetmeden önce onay ekranı: kontrol kullanıcıda
- Banka/kart bağlantısı yok; ses kaydı saklanmaz
- Kişisel / işletme / yatırım ayrı bölümler
- Her kayıt kendi gününün TCMB kuruyla dolar/euro
**How we do it differently:** Form yerine konuşma; yapay zeka yapılandırır, insan onaylar.
**Why that's better:** Kayıt 5 saniyeye iner, alışkanlık sürer; veriler daha eksiksiz olur.
**Why customers choose us:** Hız (sesle), gizlilik (banka bağlantısı yok), Türkçe'ye özgü anlama.

## Objections
| Objection | Response |
|-----------|----------|
| "Yapay zeka yanlış kaydederse?" | Kaydetmeden önce her şeyi görüp düzeltirsin; onaylamadan kayıt olmaz. |
| "Sesim saklanıyor mu?" | Ses yalnız metne çevrilmek için işlenir, saklanmaz. |
| "Günde 3 kayıt az." | İsteğe bağlı reklamla ek hak; Pro'da sınırsız. |
| "Bankamla bağlanmıyor, elle mi gireceğim?" | Tek cümlede birden fazla harcama; tekrarlayanlar kendiliğinden eklenir. |

**Anti-persona:** Bütün hesaplarının otomatik içe aktarılmasını isteyen, hiç kayıt girmek istemeyen kullanıcı; yatırım portföy yönetimi/alım-satım arayan kullanıcı.

## Switching Dynamics
**Push:** Form doldurmaktan sıkılmak, bankanın kategori analizinin yetersizliği, ay sonu sürprizleri.
**Pull:** Sesle saniyede kayıt, limit/hedef uyarıları, sade ve Türkçe arayüz.
**Habit:** Mevcut Excel/not alışkanlığı; "zaten bankam gösteriyor" düşüncesi.
**Anxiety:** Finansal verinin gizliliği; yapay zekanın hatalı kayıt yapması; aboneliğe bağlanma.

## Customer Language
**How they describe the problem:** *(yayından sonra Play yorumlarından ve destek e-postalarından birebir alıntılarla doldur)*
**How they describe us:** *(doldur)*
**Words to use:** harcama takibi, gelir gider, bütçe, limit, hedef, söyle/kaydet, tek dokunuş, paranın izi, kontrol sende
**Words to avoid:** "fintech", "AI" (Türkçe aramada "yapay zeka" kullanılır), "yatırım tavsiyesi", "en iyi/1 numara" (Play politikası), banka bağlantısı ima eden ifadeler
**Glossary:**
| Term | Meaning |
|------|---------|
| Kayıt hakkı (enerji) | Free plandaki günlük kayıt sayısı |
| Hane | Aile/ortak bütçe paylaşımı |
| Bölüm | Kişisel / İşletme / Yatırım ayrımı |
| Limit / Hedef | Kategori başına üst sınır ya da ulaşılacak tutar |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|-----------|-------|--------------|--------------|
| Sade | Kısa cümle, günlük Türkçe | Teknik jargon | "Söyle, yapay zeka kaydetsin." |
| Sakin güven | Kontrol kullanıcıda, abartı yok | Korkutma, suçlama | "Kontrol her zaman sende." |
| Samimi "sen" dili | Arkadaşça yönlendirme | Laubalilik | "Biraz yavaşlamakta fayda var." |

**Tone by context:**
- Support: çözüm odaklı, kısa, özür + adım
- Launch: somut fayda + kısa örnek cümle
- Errors: ne oldu + ne yapmalı, suçlamadan
- Sales (Pro): fayda önce, baskı yok; "Şimdilik değil" her zaman görünür
- Social: örnek cümle → sonuç ekranı gösterimi
**Terms we own:** "Paranın izini sür", "Söyle, yapay zeka kaydetsin", "Kontrol her zaman sende"
**Never use (and why):** "Ücretsiz" (Play başlık politikası), "garanti kazanç / yatırım tavsiyesi" (finansal hizmet değiliz), "banka entegrasyonu" (yok)

## Proof Points
**Metrics:** *(yayından sonra: indirme, puan, kayıt sayısı)*
**Customers:** —
**Testimonials:** *(kapalı test geri bildirimlerinden izinle alıntı eklenebilir)*
**Value themes:**
| Theme | Proof |
|-------|-------|
| Hız | Tek cümlede çoklu kayıt (ekran görüntüsü 1) |
| Kontrol | Onay ekranı (ekran görüntüsü 2) |
| Gizlilik | Banka bağlantısı yok, ses saklanmaz, hesap silme (ekran görüntüsü 6) |

## Goals
**Business goal:** Play üretim yayınından sonra organik indirme ve Free → Pro dönüşümü; sonra iOS.
**Conversion action:** Yükleme → ilk kayıt (aktivasyon) → 7 gün içinde düzenli kullanım → Pro (yıllık).
**Current metrics:** Henüz yok (build 10 üretim incelemesinde). Ölçüm planı: `docs/BUYUME-ANALIZI.md` §4, sorgular: `scripts/metrikler.sql`.

## Learnings
*Decisions and tested lessons. Newest first. Keep it to about 20 active entries.*
| Date | Learning | Evidence | Applies to | Status |
|------|----------|----------|------------|--------|
| 2026-10-21 | Mağaza başlığında "AI" yerine "yapay zeka"/"sesli" kullanılır | Türkçe aramada "yapay zeka" aranıyor (karar, test değil) | aso | watch |

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-11-12) — Initial context, koddan ve mağaza metinlerinden taslaklandı.
