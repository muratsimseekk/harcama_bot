// Uygulama içi yasal metinler. Kanonik (güncel) sürüm YASAL_URL'de yayınlanır;
// mağaza inceleme ekibi ve çevrimdışı kullanım için burada da tutulur.
// Değiştirdiğinde docs/gizlilik-politikasi.md ve docs/kullanim-kosullari.md ile eşitle.

export const YASAL_URL = {
  gizlilik: "https://muratsimseekk.github.io/harcama/gizlilik-politikasi",
  kosullar: "https://muratsimseekk.github.io/harcama/kullanim-kosullari",
};

export const DESTEK_EPOSTA = "iletisim@ornek.com";

export const GIZLILIK_METNI = `GİZLİLİK POLİTİKASI
Son güncelleme: 2026-09-08

Bu politika, "Harcama" uygulamasını kullandığında hangi kişisel verilerini, neden ve nasıl
işlediğimizi; kimlerle paylaştığımızı ve haklarını açıklar. Uygulama 6698 sayılı KVKK ve —
AB'deki kullanıcılar için — GDPR kapsamında yürütülür.

1) TOPLADIĞIMIZ VERİLER
• E-posta adresi — kimlik doğrulama, giriş, şifre sıfırlama.
• Ad (isteğe bağlı) — uygulama içinde seni/hane üyelerini tanımlamak.
• Şifre — bize açık metin ulaşmaz; kimlik sağlayıcımız (Supabase) tek yönlü şifreleyerek saklar.
• Harcama/gelir kayıtların — tutar, kategori, tarih, açıklama, not. Bütçe takibi ve özet için.
• Sesli/yazılı işlem girdileri — metne çevirmek ve tutar/kategori/tarih çıkarmak için.
• Kategori, bütçe ve hedef ayarların.
• Hane bilgisi — bir haneye katılır/oluşturursan, üyelerle harcamaları ortak görmek için.
• Cihaz bildirim jetonu — bildirim izni verirsen, bütçe/hedef bildirimleri göndermek için.
• Kısa süreli teknik/hata kayıtları — hata teşhisi ve kötüye kullanımı önlemek için.

TOPLAMADIKLARIMIZ: Konum, kişi listesi, reklam kimliği, banka/kart bilgisi. Uygulama hiçbir
bankaya veya ödeme sistemine bağlanmaz. Reklam göstermiyoruz, veri satmıyoruz.

2) SESLİ GİRDİLER
Sesli işlem eklediğinde ses kaydın, metne çevrilmek üzere yapay zeka sağlayıcımıza gönderilir.
Ses dosyası işlendikten hemen sonra sunucularımızdan SİLİNİR; kalıcı saklanmaz. Yalnızca
çevrilen metinden çıkarılan işlem kaydı, onayınla hesabına kaydedilir.

3) PAYLAŞIM (VERİ İŞLEYENLER)
Verini üçüncü kişilere satmayız. Uygulamanın çalışması için:
• Supabase, Inc. (ABD) — kimlik doğrulama + veritabanı.
• Groq, Inc. (ABD) — yapay zeka: ses→metin ve işlem çıkarımı.
• Render Inc. (ABD) — uygulama sunucusu.
• Expo/EAS (ABD) — push bildirim iletimi.
• Apple / Google — uygulama dağıtımı ve abonelik ödemeleri.
Yurt dışına (ABD) aktarım, hizmetin sağlanması için gereklidir ve kayıt olurken açık
rızanla gerçekleşir. Yasal zorunluluk hâlinde yetkili mercilerle paylaşabiliriz.

4) SAKLAMA SÜRESİ
Hesap ve işlem verilerin, hesabın aktif olduğu sürece saklanır. Hesabını sildiğinde tüm
kayıtların ve kimlik bilgilerin kalıcı olarak silinir (en geç 30 gün içinde yedeklerden de).
Ses kayıtları saklanmaz.

5) HAKLARIN (KVKK m.11 / GDPR)
Verilerinin işlenip işlenmediğini öğrenme, erişme ve kopyasını alma, düzeltme, SİLME
(uygulama içinden "Hesabı Sil" ile kendin yapabilirsin), işlemeye itiraz, rızanı geri çekme.
Talepler için: ${DESTEK_EPOSTA} — en geç 30 gün içinde yanıtlarız.

6) GÜVENLİK
Tüm veri aktarımı HTTPS/TLS ile şifrelenir. Şifren tek yönlü şifrelenir. Veritabanı erişimi
yetkili sunucularımızla sınırlıdır.

7) ÇOCUKLAR
Uygulama 18 yaş altına yönelik değildir; bilerek 18 yaş altından veri toplamayız.

8) DEĞİŞİKLİKLER
Politikayı güncelleyebiliriz; önemli değişiklikleri uygulama içinde bildiririz. Güncel sürüm
${YASAL_URL.gizlilik} adresinde yayınlanır.

9) İLETİŞİM
Veri sorumlusu ve iletişim: ${DESTEK_EPOSTA}
`;

export const KOSULLAR_METNI = `KULLANIM KOŞULLARI
Son güncelleme: 2026-09-08

"Harcama" uygulamasını kullanarak bu koşulları kabul etmiş olursun.

1) HİZMET
Uygulama, harcama ve gelirlerini elle veya sesle kaydedip bütçe/hedef takibi ve özet/analiz
sunan bir kişisel finans aracıdır. Bir bankacılık, yatırım danışmanlığı veya para transferi
hizmeti DEĞİLDİR. Sunduğu özetler bilgilendirme amaçlıdır; finansal kararlarından sen
sorumlusun.

2) HESAP
Kayıt için geçerli bir e-posta ve şifre gerekir. Hesap güvenliğinden ve hesabında yapılan
işlemlerden sen sorumlusun. 18 yaşından büyük olmalısın. Hesabını istediğin zaman
"Ayarlar → Hesabı Sil" ile silebilirsin.

3) ÜYELİK VE ÖDEMELER
Ücretsiz 7 günlük deneme süresi vardır. Deneme sonunda ücretli Base veya Pro üyeliğe
geçebilirsin. TÜM ÖDEMELER YALNIZCA App Store (Apple) veya Google Play üzerinden alınır;
uygulama dışında ödeme yöntemi sunmayız. Abonelikler iptal edilmezse dönem sonunda otomatik
yenilenir (bitiminden en az 24 saat önce iptal edilmezse). Abonelik yönetimi/iptali
cihazının App Store / Google Play ayarlarından yapılır. İadeler Apple/Google politikalarına
tabidir.

4) KABUL EDİLEBİLİR KULLANIM
Uygulamayı yasa dışı amaçlarla, başkalarının haklarını ihlal ederek, sistemi kötüye
kullanarak veya otomatik araçlarla kullanamazsın.

5) İÇERİĞİN
Girdiğin veriler sana aittir. Uygulamayı çalıştırmak için (saklama, işleme, yapay zeka ile
analiz) bize sınırlı kullanım izni vermiş olursun. Ayrıntı: Gizlilik Politikası.

6) HİZMETİN SUNUMU
Uygulamayı "olduğu gibi" sunuyoruz; kesintisiz/hatasız çalışacağını garanti etmiyoruz.
Yapay zeka çıkarımları hatalı olabilir; kaydetmeden önce kontrol etmek senin sorumluluğun.

7) SORUMLULUĞUN SINIRLANMASI
Yasaların izin verdiği ölçüde, kullanımdan doğan dolaylı zararlardan sorumlu değiliz.

8) FESİH
Koşulları ihlal edersen hesabını askıya alabilir/kapatabiliriz. Sen de hesabını silerek
ayrılabilirsin.

9) UYGULANACAK HUKUK
Türkiye Cumhuriyeti hukuku uygulanır.

10) İLETİŞİM
${DESTEK_EPOSTA}
`;
