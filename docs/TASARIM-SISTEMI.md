# Paraİzi Tasarım Sistemi — başka projeye taşıma rehberi

> Paraİzi (Expo SDK 57 · React Native 0.86 · expo-router) mobil uygulamasının arayüz dili:
> renkler, fontlar, boşluklar, bileşenler, animasyonlar ve yazım kuralları. Amaç bunu
> **KPSS Tarih** projesine aynen (ya da yalnız aksan rengini değiştirerek) taşımak.
> Son güncelleme: 2026-10-25. Kaynak dosyalar `mobile/lib/` ve `mobile/components/` altında.

---

## 0. Hızlı taşıma (özet)

1. Paketleri kur:
   ```bash
   npx expo install @expo-google-fonts/inter @expo-google-fonts/newsreader expo-font expo-splash-screen \
     expo-haptics expo-linear-gradient react-native-svg react-native-safe-area-context \
     @react-native-async-storage/async-storage @expo/vector-icons
   ```
2. Şu dosyaları kopyala (bağımlılık sırasıyla):

   | Dosya | Ne işe yarar | Taşırken |
   |---|---|---|
   | `lib/tema.tsx` | Açık / koyu / sistem tema seçimi (AsyncStorage'da saklanır) | Aynen |
   | `lib/theme.ts` | Renk paleti, `SP` boşluk, `R` köşe, `FONT`/`SERIF`, `T` tipografi, `golge()` | Aksan rengini değiştirebilirsin (§1) |
   | `components/Metin.tsx` | `Text` yerine — fontWeight'e göre doğru Inter dosyasını seçer | Aynen |
   | `components/Buton.tsx` | Hap buton (birincil / ikincil / hayalet), yükleniyor + haptik | Aynen |
   | `components/base.tsx` | `Kart`, `Sekmeli`, `Cip`, `IkonDaire`, `BosDurum`, `Yukleniyor` (iskelet), `AyarGrup`/`AyarSatir` | Aynen |
   | `components/Alan.tsx` | Metin girişi (etiket + şifre göster/gizle) | Aynen |
   | `components/Uyari.tsx` | `Alert.alert` yerine temalı uyarı/onay penceresi (`useUyari`) | Aynen |
   | `components/YuklemeHalkasi.tsx` | Tam ekran yükleme animasyonu (iç içe dönen halkalar) | Döngü metinlerini değiştir |
   | `components/IslemKatmani.tsx` | Kaydet/sil sırasında "bekleyen → ✓ başarılı" katmanı | Aynen |
   | `components/EkranBasligi.tsx` | Ekran iskeleti: başlık satırı + kaydırılabilir gövde + çek-yenile | Bildirim zilini kendi verine bağla ya da kaldır |
   | `components/AltNav.tsx` | Alt sekme çubuğu, ortada yükseltilmiş "+" | Sekme adları/ikonları |
   | `components/HataSiniri.tsx` | Çökmede beyaz ekran yerine Türkçe hata ekranı | Sentry yoksa o satırı sil |
3. `app/_layout.tsx` içinde font yükleme + sağlayıcı sırasını kur (§3, §9).
4. `Alert.alert` ve düz `Text` kullanma — her yerde `useUyari()` ve `Metin`.

---

## 1. Renkler

Karakter: **sıcak krem zemin + mercan aksan + sade beyaz yüzey**. Saf beyaz/siyah zemin yok,
gri tonlar hep sıcak (sarımsı). Koyu modda zemin kahverengimsi antrasit.

### Açık tema (`light`)
| Token | Renk | Kullanım |
|---|---|---|
| `bg` | `#FAF9F5` | Ekran zemini (sıcak kırık beyaz) |
| `bgAlt` | `#F0EEE6` | İkincil zemin |
| `aksan` | `#D97757` | **Marka rengi (mercan)** — birincil buton, seçili sekme, vurgu |
| `aksanSoft` | `#F3E4DB` | Soluk mercan — giriş kutusu zemini, ikincil buton, ikon arkası |
| `aksanUstu` | `#FFFFFF` | Mercan zemin üstündeki yazı |
| `card` | `#FFFFFF` | Kart yüzeyi |
| `cardAlt` | `#F0EEE6` | Sekmeli seçici zemini, iskelet çizgileri, zil düğmesi |
| `border` | `#E5E2D9` | Çerçeve |
| `hairline` | `#EBE8DF` | İnce ayraç çizgisi |
| `text` | `#141413` | Ana metin (sıcak neredeyse-siyah) |
| `textMuted` | `#5C5A54` | İkincil metin |
| `textFaint` | `#8F8B80` | Soluk metin, placeholder, chevron |
| `blue` / `blueSoft` | `#61758A` / `#E3E5E4` | Sakin arduvaz — tutar/tarih/ilerleme |
| `danger` / `dangerSoft` | `#BF4D43` / `#F5E4E1` | Hata, silme |
| `warn` / `warnSoft` | `#B4843C` / `#F3E7D3` | Uyarı |
| `success` / `successSoft` | `#5F8A6B` / `#E4EEE5` | Başarı ✓ |
| `golgeRenk` | `#3A2A20` | iOS gölge rengi (kahverengi — gri değil) |

### Koyu tema (`dark`)
| Token | Renk | | Token | Renk |
|---|---|---|---|---|
| `bg` | `#1F1E1D` | | `text` | `#F5F4EF` |
| `bgAlt` / `card` | `#262624` | | `textMuted` | `#B8B5AC` |
| `cardAlt` | `#302F2C` | | `textFaint` | `#807C72` |
| `aksan` | `#E0866A` | | `border` | `#3A3934` |
| `aksanSoft` | `#3A2E28` | | `hairline` | `#34332F` |
| `aksanUstu` | `#241A15` | | `danger` | `#E0796C` |
| `success` | `#7FA98A` | | `warn` | `#D0A15E` |
| `blue` | `#8AA0B4` | | `golgeRenk` | `#000000` |

Kural: koyu temada aksan biraz açılır (`#E0866A`), aksan üstündeki yazı **koyu** olur (`#241A15`).

### Grafik / kategori paleti (12 renk, sırayla)
`#D97757 #C15F3C #7A9E7E #61758A #C99A4E #9B8FB0 #A56E5A #6E8B8A #B0894B #5F8A6B #8C6D9C #7C8B3E`

### Renk kullanma kuralları
- Renkleri **asla sabit yazma** — `const renk = useRenkler();` → `renk.aksan` (koyu mod otomatik).
- Saydam ton: `renk.aksan + "26"` (≈%15), `+ "1A"` (≈%10), `+ "22"`, katman için `renk.bg + "F2"`.
- İkon kutusu deseni: zemin `renk + "26"`, ikon aynı rengin dolu hali (`IkonDaire`).

### KPSS'e uyarlama
Aynı aileyi korumak için yalnız `aksan` üçlüsünü değiştirmen yeterli (örn. tarih için
bordo/lacivert): `aksan`, `aksanSoft` (aksanın çok açık hali), koyu temada `aksan`'ın bir ton
açığı + `aksanSoft`'un koyu hali. Krem zemin, sıcak griler ve tipografi aynı kalırsa iki
uygulama "kardeş" görünür. Aynı mercanı kullanırsan tamamen aynı marka hissi olur.

---

## 2. Boşluk, köşe, gölge

```ts
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;
export const R  = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 } as const;
```
- Ekran yan boşluğu `SP.lg` (16). Kartlar arası `gap: SP.md` (12).
- Kart köşesi `R.lg` (22), giriş kutusu `R.md` (16), butonlar ve sekmeli seçici **hap** (`R.pill`).
- İkon kutuları "yumuşak kare": boyut × 0,3 köşe (40 px → 12).

```ts
export function golge(seviye: 1 | 2 | 3 = 1): ViewStyle {
  if (Platform.OS === "android") return { elevation: seviye === 1 ? 1 : seviye === 2 ? 3 : 7 };
  const cfg = { 1: { o: 0.05, r: 12, y: 4 }, 2: { o: 0.08, r: 20, y: 8 }, 3: { o: 0.13, r: 32, y: 15 } }[seviye];
  return { shadowColor: "#3A2A20", shadowOpacity: cfg.o, shadowRadius: cfg.r, shadowOffset: { width: 0, height: cfg.y } };
}
```
- `golge(1)`: kartlar, satırlar · `golge(2)`: FAB, ana buton · `golge(3)`: pencereler/diyaloglar.
- Gölgeler çok hafif ve kahverengi tonlu — "yüzen" değil "oturan" kartlar.

---

## 3. Tipografi

**İki aile:**
- **Newsreader** (serif) → başlıklar. Uygulamaya editoryal, sıcak bir kimlik veriyor.
- **Inter** → gövde, buton, etiket, sayı.

Font yükleme (`app/_layout.tsx`):
```tsx
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader/500Medium";
import { Newsreader_600SemiBold } from "@expo-google-fonts/newsreader/600SemiBold";
import { Newsreader_700Bold } from "@expo-google-fonts/newsreader/700Bold";

SplashScreen.preventAutoHideAsync().catch(() => {});
setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 3000); // ne olursa olsun 3 sn'de kalksın

// RootLayout içinde: fontlar gelene kadar (en fazla 2,5 sn) hiçbir şey çizme —
// yoksa yedek fontun geniş metrikleri son harfleri kırpıyor ("İşlem" → "İşle").
const [fontHazir, fontHata] = useFonts({ Inter_400Regular, /* … hepsi */ Newsreader_700Bold });
const [zamanAsimi, setZamanAsimi] = useState(false);
useEffect(() => { const t = setTimeout(() => setZamanAsimi(true), 2500); return () => clearTimeout(t); }, []);
useEffect(() => { if (fontHazir || fontHata || zamanAsimi) SplashScreen.hideAsync().catch(() => {}); }, [fontHazir, fontHata, zamanAsimi]);
if (!fontHazir && !fontHata && !zamanAsimi) return null;
```

Ölçek (`T`):
| Stil | Font | Boyut | Kullanım |
|---|---|---|---|
| `T.display` | Newsreader 700 | 32 (−0.4 harf aralığı) | Karşılama başlıkları, büyük rakamlar |
| `T.title` | Newsreader 700 | 23 (−0.3) | Ekran başlığı, pencere başlığı |
| `T.heading` | Newsreader 600 | 18 | Kart başlığı ("Ekim ayı harcamaları") |
| `T.body` | Inter 500 | 15 | Gövde |
| `T.bodyBold` / `T.label` | Inter 600 | 15 | Etiket, form başlığı |
| `T.caption` | Inter 400 | 12.5 | Alt yazı |
| `T.overline` | Inter 600 | 12.5 (+0.4) | Bölüm başlığı ("ÜYELER") |

**`Metin` bileşeni (zorunlu):** RN'de Android, `fontWeight: "700"` verince Inter_700Bold'u
kendisi seçmiyor. `Metin`, stilde `fontFamily` yoksa `fontWeight`'e göre doğru Inter dosyasını
ekler (varsayılan 500). Her dosyada:
```tsx
import { Metin as Text } from "@/components/Metin";
<Text style={{ fontSize: 15, fontWeight: "700" }}>…</Text>   // → Inter_700Bold
<Text style={[T.title, { color: renk.text }]}>…</Text>         // serif, fontFamily T'den
```

Diğer metin kuralları:
- Durum/yükleniyor yazıları: 11 px, 700, **büyük harf**, `letterSpacing: 2.4`, soluk renk.
- Para/sayılar: Inter 700-800; ana rakam büyük, birim (₺) küçük ve soluk.
- Paragraflarda `lineHeight: 21` (15 px gövde için).

---

## 4. Bileşenler

### Buton (`Buton`)
- Hap şekli, `paddingVertical: 15`, yazı 16 px / 700.
- Varyantlar: **birincil** (mercan dolu, beyaz yazı) · **ikincil** (`aksanSoft` zemin, mercan yazı) ·
  **hayalet** (şeffaf, 1.5 px mercan çerçeve).
- Basınca `opacity: 0.8`; `pasif`/`yukleniyor` → `opacity: 0.55`.
- **Her basışta hafif titreşim:** `Haptics.impactAsync(ImpactFeedbackStyle.Light)`.
- `yukleniyor` true iken yazının yerine `ActivityIndicator` (buton boyutu değişmez).
```tsx
<Buton yazi="Kaydet" onPress={kaydet} yukleniyor={m.isPending} />
<Buton yazi="Vazgeç" varyant="hayalet" onPress={kapat} />
```

### Buton üstü yükleniyor kuralı (önemli)
Bekleme yapan **her** dokunulabilir öğe kendi üstünde dönen daire gösterir, sayfa donuk
görünmez. Tam ekran katman yalnız "kaydet → ekrandan çık" gibi akışlarda.
```tsx
<Pressable onPress={() => sil.mutate(id)} disabled={sil.isPending} hitSlop={8}>
  {sil.isPending && sil.variables === id
    ? <ActivityIndicator size={18} color={renk.danger} />
    : <Ionicons name="trash-outline" size={18} color={renk.danger} />}
</Pressable>
```
Liste satırlarında `mutation.variables === satır.id` ile **yalnız basılan satır** döner.
Pencere içi "Kaydet" → işlem bitene kadar pencere açık kalır, butonda daire döner.

### Kart (`Kart`)
Beyaz yüzey, `R.lg` köşe, `SP.lg` iç boşluk, `golge(1)`. `onPress` verilirse dokunulabilir.
Vurgulu kart: `style={{ backgroundColor: renk.aksan }}` + içerik `aksanUstu`.

### Sekmeli seçici (`Sekmeli`)
`cardAlt` zeminli hap kap, içinde eşit genişlikte hap seçenekler; seçili olan beyaz
(`card`) + `golge(1)` + 700 kalın; diğerleri 600 ve `textMuted`. `kucuk` prop'u daha ince.
```tsx
<Sekmeli secenekler={["gun","hafta","ay"] as const} etiket={(x) => ETIKET[x]} secili={p} onSec={setP} />
```

### Çip (`Cip`) · İkon dairesi (`IkonDaire`)
- Çip: hap, 1 px çerçeve, 12.5 px / 600; seçiliyken dolu (aksan ya da kategori rengi).
- IkonDaire: yumuşak kare, zemin rengin %15'i, ikon aynı renk (`boyut*0.46`).

### Giriş alanı (`Alan`)
Çerçevesiz, `aksanSoft` zeminli kutu, `R.md`, min yükseklik 52, yazı 15.5 px Inter 500.
Üstte `T.label` etiket. `sifre` prop'u → sağda göz ikonu. Placeholder `textFaint`.

### Ayar listesi (`AyarGrup` / `AyarSatir`)
Tek beyaz kart içinde satırlar; aralarında `hairline` çizgi; solda 32 px yumuşak kare ikon
(`textMuted + "1A"`), sağda `chevron-forward`. `tehlike` → kırmızı. Basınca satır `cardAlt`.

### Boş durum (`BosDurum`) · İskelet (`Yukleniyor`)
- Boş: 60 px yumuşak kare içinde soluk ikon + ortalı açıklama.
- Kart içi yükleme: spinner yerine **iskelet çizgiler** (`cardAlt`, 14 px, yuvarlak) — düzeni
  önceden gösterdiği için daha hızlı hissettirir.

### Uyarı / onay penceresi (`useUyari`)
`Alert.alert` **kullanılmaz** (Android'de Material, iOS'ta sistem görünümü — temaya yabancı).
```tsx
const uyari = useUyari();
uyari("Kaydedilemedi", "Tekrar dene.");
uyari("Sil", '"Market" silinsin mi?', [
  { yazi: "Vazgeç", stil: "vazgec" },               // çerçeveli soluk
  { yazi: "Sil", stil: "tehlike", onPress: sil },    // kırmızı dolu
], { ikon: "trash-outline" });                       // ikon verilirse büyük, ortalı düzen
```
Kart: `card` zemin, `golge(3)`, arka plan karartma; 2 buton yan yana, 1 ya da 3+ alt alta;
Android geri tuşu kapatır; arka plana dokununca kapanır.

### Alt panel (bottom sheet) deseni
`Modal transparent animationType="slide"` + `rgba(0,0,0,0.45)` arka plan; üst köşeleri 28
yuvarlak `card`; üstte 40×4 tutamaç (`border`); ortada 68 px daire ikon, `T.title` başlık,
ortalı açıklama, altta tam genişlik hap butonlar (dolu + çerçeveli), en altta soluk "Kapat".
(Örnek: `components/EnerjiSheet.tsx`.)

### Ekran iskeleti (`EkranBasligi`)
`bg` zemin; üstte safe-area içinde **[geri ‹] — serif başlık (T.title) — [zil]** satırı;
altında ince `hairline` çizgi; gövde `ScrollView` (`padding: SP.lg, gap: SP.md`,
alt boşluk 40). Çek-yenile spinner'ı yalnız kullanıcı çekince döner (arka plan
yenilemelerinde takılı kalmasın). Zil: 36 px daire `cardAlt`, okunmamışta sağ üstte
9 px kırmızı nokta (zemin renginde 1.5 px kenar).

### Alt sekme çubuğu (`AltNav`)
`card` zemin, üstte hairline. İkonlar 23 px: seçili → dolu ikon + mercan + 44 px
`aksanSoft` yumuşak kare arka plan; seçili değil → outline ikon + `textFaint`.
Ortadaki "+" : 52 px mercan yumuşak kare (köşe 20), `golge(2)`, **−18 px yukarı taşar**.

### Profil / liste ekranları
İçerik **mutlaka** `ScrollView` içinde ve altta `paddingBottom: SP.xxl * 2` — küçük
ekranlarda son satırlar alt menünün altında kalmasın.

---

## 5. İkonlar
- Tek set: **Ionicons** (`@expo/vector-icons/Ionicons`).
- Seçili/aktif → dolu (`home`), pasif → `-outline` (`home-outline`).
- Boyutlar: sekme 23, satır ikonu 17-20, başlık okları 26, büyük daire ikonu 30-44.
- Chevron: `chevron-forward` 17-18 px `textFaint`.

---

## 6. Animasyonlar
Hepsi RN `Animated` + **`useNativeDriver: true`** (JS thread'i meşgul etmez); yalnız
`opacity` ve `transform` animasyonlanır.

| Ne | Süre / easing | Detay |
|---|---|---|
| **Başarı işareti** ✓ (kaydedildi) | 420 ms · `Easing.out(Easing.back(2))` | Daire 0.5→1 ölçek + 0→1 opaklık (ilk %35'te); yazı %30-80 arası belirir ve 8 px aşağıdan kayar. Gösterim 700 ms, sonra kapanır. |
| **Tam ekran yükleme** (`YuklemeHalkasi`) | 1000 / 2000 / 3000 / 4000 / 10000 ms lineer döngüler | 3 iç içe yay (üst, alt ters, sol hızlı) + yörünge noktası + soluk dış halka + 1600 ms nefes alan parıltı ve merkez nokta. Altında 1100 ms'de bir değişen büyük harfli durum yazısı. |
| **Grafik girişi** (pasta) | 700 ms · `Easing.out(Easing.cubic)` | Halka 0.82→1 ölçek + belirme; lejant satırları sırayla aşağıdan kayar. Veri değişince yeniden oynar. |
| **Mikrofon kayıt nabzı** | 1600 ms döngü · `Easing.out(Easing.ease)` | Butonun arkasında halka 1→2 ölçek, 0.5→0 opaklık (radar dalgası). |
| **Karşılama sahneleri** | Sahne başına | 4 sayfa yatay `pagingEnabled`; her sahnenin animasyonu sayfaya gelince baştan oynar; üstte `LinearGradient` (aksanSoft → bg); sayfa noktaları: aktif 22 px uzun mercan hap, diğerleri 8 px `border`. |
| Basma geri bildirimi | anlık | `pressed && { opacity: 0.6–0.85 }` — ölçek animasyonu yok |

Animasyon kuralları:
- Her `Animated.loop`/`timing` effect'i temizlikte `a.stop()` + `v.setValue(0)` yapar.
- Başarı/geri bildirim kısa: 0.4-1 sn. Kullanıcıyı bekletmez (ör. reklam sonrası "kazandın" 1 sn).
- Görseller kodla çizilir (SVG/View) → koyu modda kendiliğinden uyumlu ve her ekranda keskin.

---

## 7. Haptik (titreşim)
- Her `Buton` basışı: `ImpactFeedbackStyle.Light`.
- Kayıt başlat: `Medium` · kayıt bitir/vazgeç: `Light`.
- Başka yerde titreşim kullanılmıyor — abartma.

---

## 8. Koyu mod
- `TemaProvider` (`lib/tema.tsx`): mod = `system | light | dark`, AsyncStorage'da `tema.mod`
  anahtarıyla saklanır; `system` ise `useColorScheme()`.
- Bileşenler yalnız `useRenkler()` kullanır → otomatik uyum.
- Durum çubuğu: `<StatusBar style={koyu ? "light" : "dark"} />` (`TemaliDurumCubugu`).
- Ayarlar → Görünüm ekranında üç seçenek (Sekmeli ile).

---

## 9. Sağlayıcı sırası (`app/_layout.tsx`)
```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <HataSiniri>
    <SafeAreaProvider>
      <TemaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TemaliDurumCubugu />
            <UyariProvider>
              <View style={{ flex: 1 }}><Kapi /></View>
              <GuncellemePenceresi />
            </UyariProvider>
          </AuthProvider>
        </QueryClientProvider>
      </TemaProvider>
    </SafeAreaProvider>
  </HataSiniri>
</GestureHandlerRootView>
```

---

## 10. Yazım dili (UX metinleri)
- **Türkçe, "sen" dili**, sıcak ve kısa: "Kaydedildi", "Tekrar dene", "Bir şeyler ters gitti".
- Kullanıcı **asla** ham teknik/İngilizce hata görmez ("HTTP 500", "Network request failed").
  Tüm hatalar tek yerden Türkçeye çevrilir (`lib/hata.ts` → `hataMesaji()`), beklenmeyenler
  Sentry'ye gider.
- Butonlar fiil: "Kaydet", "Ekle", "Vazgeç", "Sil", "Devam", "Hemen Başla".
- Onay soruları net: `"Market" silinsin mi? (kayıtlar etkilenmez)`.
- Boş durum yazıları yönlendirici: "Limit yok — dokunup ekle".

---

## 11. Mağaza görselleri (aynı dil)
- Ekran görüntüleri: `scripts/magaza_ekran_goruntuleri.py` — 1080×1920, üstte Newsreader
  başlık (bir kelime mercan vurgulu) + Inter alt metin, altta çerçeveli telefon (alttan taşar),
  "yüzen" büyütülmüş arayüz kartları, krem→şeftali / mercan degrade zemin.
- İkon ve özellik grafiği: `scripts/ikon_olustur.py <kaynak.png>` — düz zeminli kare logodan
  icon / adaptive / splash / bildirim ikonu + 512 mağaza ikonu + 1024×500 özellik grafiği.
- İki betik de KPSS'e font yolu ve metinler değiştirilerek uyarlanabilir.
