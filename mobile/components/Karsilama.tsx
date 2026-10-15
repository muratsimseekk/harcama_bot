import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Metin as Text } from "@/components/Metin";
import { AY_UZUN, tutarKisa } from "@/lib/format";
import { golge, PALET, R, SP, T, useRenkler } from "@/lib/theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require("../assets/icon.png");

/**
 * İlk açılış karşılaması — 4 canlı sahne (görsel dosyası yok, hepsi kodla çizilir:
 * koyu modda kendiliğinden uyum sağlar, her ekranda keskin). Her sahnenin animasyonu
 * o sayfaya gelindiğinde baştan oynar. Vurgu: sesli yapay zeka kaydı (2. sahne).
 */
const SLAYTLAR: {
  etiket?: string;
  baslik: string;
  metin: string;
  Sahne: (p: { aktif: boolean }) => React.ReactElement;
}[] = [
  {
    baslik: "Paraİzi'ne hoş geldin",
    metin: "Harcamalarını saniyeler içinde kaydet, paranın nereye gittiğini net olarak gör.",
    Sahne: SahneKarsilama,
  },
  {
    etiket: "YAPAY ZEKA İLE SESLİ KAYIT",
    baslik: "Söyle, yapay zeka kaydetsin",
    metin:
      "Mikrofona dokun ve konuş. Tutarı, kategoriyi ve tarihi yapay zeka ayıklar; tek cümlede birden fazla harcama bile olur. Sen sadece onayla.",
    Sahne: SahneSes,
  },
  {
    baslik: "Limit koy, hedefine ulaş",
    metin:
      "Aylık ve kategori bütçeleri belirle; sınıra yaklaşınca seni uyaralım. Birikim hedefini adım adım takip et.",
    Sahne: SahneButce,
  },
  {
    baslik: "Paranın izini sür",
    metin:
      "Grafikler, her akşam günlük ve her pazar haftalık özet. Bankana bağlanmadan, tamamen senin kontrolünde.",
    Sahne: SahneAnaliz,
  },
];

/** `onBitir`: "Atla" ya da son sayfadaki "Hemen Başla". */
export function Karsilama({ onBitir, bitirYazi = "Hemen Başla" }: { onBitir: () => void; bitirYazi?: string }) {
  const renk = useRenkler();
  const { width, height } = useWindowDimensions();
  // Kısa ekranlarda sahne küçülsün, yazılar ve düğme ekranda kalsın
  const olcek = Math.min(1, Math.max(0.76, (height - 360) / 460));
  const ref = useRef<ScrollView>(null);
  const [i, setI] = useState(0);
  const son = i === SLAYTLAR.length - 1;

  const bitir = onBitir;

  function ileri() {
    if (son) return bitir();
    ref.current?.scrollTo({ x: (i + 1) * width, animated: true });
    setI(i + 1);
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.bg }]}>
      <LinearGradient
        colors={[renk.aksanSoft, renk.bg]}
        style={[StyleSheet.absoluteFill, { bottom: "35%" }]}
      />
      <SafeAreaView style={s.kok} edges={["top", "bottom"]}>
        <View style={s.ustBar}>
          {!son && (
            <Pressable onPress={bitir} hitSlop={12}>
              <Text style={{ color: renk.textMuted, fontSize: 15, fontWeight: "600" }}>Atla</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={s.kok}
        >
          {SLAYTLAR.map(({ etiket, baslik, metin, Sahne }, k) => (
            <View key={k} style={[s.slayt, { width }]}>
              <View style={[s.sahne, { transform: [{ scale: olcek }] }]}>
                <Sahne aktif={k === i} />
              </View>
              <View style={s.yazilar}>
                {etiket && (
                  <View style={[s.etiket, { backgroundColor: renk.aksan }]}>
                    <Ionicons name="sparkles" size={12} color={renk.aksanUstu} />
                    <Text style={{ color: renk.aksanUstu, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6 }}>
                      {etiket}
                    </Text>
                  </View>
                )}
                <Text style={[T.display, { color: renk.text, textAlign: "center", fontSize: 29 }]}>{baslik}</Text>
                <Text style={[s.metin, { color: renk.textMuted }]}>{metin}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={s.alt}>
          <View style={s.noktalar}>
            {SLAYTLAR.map((_, k) => (
              <View
                key={k}
                style={[
                  s.nokta,
                  k === i ? { width: 22, backgroundColor: renk.aksan } : { backgroundColor: renk.border },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={ileri}
            style={({ pressed }) => [s.buton, { backgroundColor: renk.aksan }, golge(2), pressed && { opacity: 0.85 }]}
          >
            <Text style={{ color: renk.aksanUstu, fontSize: 16.5, fontWeight: "800" }}>
              {son ? bitirYazi : "Devam"}
            </Text>
            <Ionicons name="arrow-forward" size={19} color={renk.aksanUstu} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animasyon yardımcıları
// ---------------------------------------------------------------------------

/** Sahne aktif olunca 0→1 (gecikmeli), pasif olunca sıfırlanır. */
function useGiris(aktif: boolean, gecikme = 0, sure = 450, nativeDriver = true) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!aktif) {
      v.setValue(0);
      return;
    }
    const a = Animated.timing(v, {
      toValue: 1,
      duration: sure,
      delay: gecikme,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    });
    a.start();
    return () => a.stop();
  }, [aktif, v, gecikme, sure, nativeDriver]);
  return v;
}

/** Aşağıdan süzülerek belirme */
function belir(v: Animated.Value, mesafe = 14) {
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [mesafe, 0] }) }],
  };
}

function Kart({ children, style }: { children: React.ReactNode; style?: object }) {
  const renk = useRenkler();
  return <View style={[s.kart, { backgroundColor: renk.card }, golge(2), style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// 1) Karşılama — logo + bu ayın özeti
// ---------------------------------------------------------------------------

const KARSILAMA_SATIR = [
  { ad: "Market", tutar: 4200, oran: 0.82 },
  { ad: "Kafe/Restoran", tutar: 2150, oran: 0.46 },
  { ad: "Ulaşım", tutar: 1600, oran: 0.34 },
];

function SahneKarsilama({ aktif }: { aktif: boolean }) {
  const renk = useRenkler();
  const logo = useGiris(aktif, 0, 600);
  const kart = useGiris(aktif, 250);
  const cubuk = useGiris(aktif, 550, 800, false);
  const ay = AY_UZUN[new Date().getMonth()];

  return (
    <View style={s.sahneIc}>
      <Animated.View
        style={{
          opacity: logo,
          transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        }}
      >
        <View style={[s.logoSar, golge(3)]}>
          <Image source={LOGO} style={s.logo} />
        </View>
      </Animated.View>

      <Animated.View style={[{ alignSelf: "stretch" }, belir(kart)]}>
        <Kart>
          <Text style={{ color: renk.textMuted, fontSize: 13, fontWeight: "600" }}>{ay} harcamaların</Text>
          <Text style={[T.title, { color: renk.text, fontSize: 28, marginTop: 2 }]}>
            {tutarKisa(12450)} ₺
          </Text>
          <View style={{ gap: 10, marginTop: SP.md }}>
            {KARSILAMA_SATIR.map((r, k) => (
              <View key={r.ad} style={{ gap: 5 }}>
                <View style={s.satirUst}>
                  <Text style={{ color: renk.text, fontSize: 13.5, fontWeight: "600" }}>{r.ad}</Text>
                  <Text style={{ color: renk.textMuted, fontSize: 13.5, fontWeight: "600" }}>
                    {tutarKisa(r.tutar)} ₺
                  </Text>
                </View>
                <View style={[s.ray, { backgroundColor: renk.hairline }]}>
                  <Animated.View
                    style={[
                      s.rayDolu,
                      {
                        backgroundColor: PALET[k === 0 ? 0 : k === 1 ? 4 : 3],
                        width: cubuk.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${r.oran * 100}%`] }),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </Kart>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2) Sesli kayıt — dinleyen mikrofon → yazıya dökülen cümle → ayrılan işlemler
// ---------------------------------------------------------------------------

const CUMLE = "Markete 250, dün de benzine 600 verdim";
const SES_ISLEMLER = [
  { ikon: "cart-outline" as const, ad: "Market", kat: "Market · Bugün", tutar: 250 },
  { ikon: "car-outline" as const, ad: "Benzin", kat: "Ulaşım · Dün", tutar: 600 },
];

function Dalga({ aktif }: { aktif: boolean }) {
  const renk = useRenkler();
  const cubuklar = useRef(Array.from({ length: 11 }, () => new Animated.Value(0.3))).current;
  useEffect(() => {
    if (!aktif) return;
    const donguler = cubuklar.map((v, k) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 260 + ((k * 73) % 220), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.25, duration: 260 + ((k * 53) % 200), useNativeDriver: true }),
        ]),
      ),
    );
    donguler.forEach((d) => d.start());
    return () => donguler.forEach((d) => d.stop());
  }, [aktif, cubuklar]);
  return (
    <View style={s.dalga}>
      {cubuklar.map((v, k) => (
        <Animated.View
          key={k}
          style={[s.dalgaCubuk, { backgroundColor: renk.aksan, transform: [{ scaleY: v }] }]}
        />
      ))}
    </View>
  );
}

function SahneSes({ aktif }: { aktif: boolean }) {
  const renk = useRenkler();
  const [n, setN] = useState(0);
  const halka = useRef(new Animated.Value(0)).current;
  const bitti = n >= CUMLE.length;
  const cip = useGiris(aktif && bitti, 150);
  const is1 = useGiris(aktif && bitti, 450);
  const is2 = useGiris(aktif && bitti, 700);

  // Cümle harf harf "yazıya dökülür"
  useEffect(() => {
    setN(0);
    if (!aktif) return;
    let t: ReturnType<typeof setInterval> | undefined;
    const bas = setTimeout(() => {
      t = setInterval(() => setN((x) => (x >= CUMLE.length ? x : x + 1)), 42);
    }, 700);
    return () => {
      clearTimeout(bas);
      if (t) clearInterval(t);
    };
  }, [aktif]);

  // Mikrofon çevresinde nabız halkası (dinlerken)
  useEffect(() => {
    if (!aktif || bitti) {
      halka.setValue(0);
      return;
    }
    const d = Animated.loop(
      Animated.timing(halka, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    d.start();
    return () => d.stop();
  }, [aktif, bitti, halka]);

  return (
    <View style={s.sahneIc}>
      <View style={s.mikSatir}>
        <View style={s.mikSar}>
          <Animated.View
            style={[
              s.mikHalka,
              {
                backgroundColor: renk.aksan,
                opacity: halka.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                transform: [{ scale: halka.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) }],
              },
            ]}
          />
          <View style={[s.mik, { backgroundColor: bitti ? renk.success : renk.aksan }, golge(3)]}>
            <Ionicons name={bitti ? "checkmark" : "mic"} size={34} color="#FFFFFF" />
          </View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: renk.textMuted, fontSize: 13, fontWeight: "700" }}>
            {bitti ? "Anladım!" : "Dinliyorum…"}
          </Text>
          {bitti ? (
            <Text style={{ color: renk.text, fontSize: 13, fontWeight: "600" }}>2 harcama bulundu</Text>
          ) : (
            <Dalga aktif={aktif} />
          )}
        </View>
      </View>

      <Kart style={[s.balon, { borderColor: renk.aksanSoft }]}>
        <Text style={{ color: renk.text, fontSize: 16, fontWeight: "600", lineHeight: 23 }}>
          “{CUMLE.slice(0, n)}
          {!bitti && <Text style={{ color: renk.aksan }}>|</Text>}
          {bitti && "”"}
        </Text>
      </Kart>

      <Animated.View style={[s.aiCip, { backgroundColor: renk.aksanSoft }, belir(cip, 8)]}>
        <Ionicons name="sparkles" size={13} color={renk.aksan} />
        <Text style={{ color: renk.aksan, fontSize: 12.5, fontWeight: "800" }}>Yapay zeka ayırdı</Text>
      </Animated.View>

      <View style={{ alignSelf: "stretch", gap: SP.sm }}>
        {SES_ISLEMLER.map((t, k) => (
          <Animated.View key={t.ad} style={belir(k === 0 ? is1 : is2)}>
            <Kart style={s.islem}>
              <View style={[s.islemIkon, { backgroundColor: renk.aksanSoft }]}>
                <Ionicons name={t.ikon} size={18} color={renk.aksan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: renk.text, fontSize: 14.5, fontWeight: "700" }}>{t.ad}</Text>
                <Text style={{ color: renk.textFaint, fontSize: 12.5 }}>{t.kat}</Text>
              </View>
              <Text style={{ color: renk.blue, fontSize: 15, fontWeight: "800" }}>{tutarKisa(t.tutar)} ₺</Text>
            </Kart>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3) Bütçe limiti + birikim hedefi
// ---------------------------------------------------------------------------

function SahneButce({ aktif }: { aktif: boolean }) {
  const renk = useRenkler();
  const kart1 = useGiris(aktif, 0);
  const bar1 = useGiris(aktif, 350, 1100, false);
  const uyari = useGiris(aktif, 1450);
  const kart2 = useGiris(aktif, 250);
  const bar2 = useGiris(aktif, 650, 1000, false);

  return (
    <View style={s.sahneIc}>
      <Animated.View style={[{ alignSelf: "stretch" }, belir(kart1)]}>
        <Kart>
          <View style={s.satirUst}>
            <View style={s.kartBaslik}>
              <View style={[s.islemIkon, { backgroundColor: renk.warnSoft }]}>
                <Ionicons name="cart-outline" size={17} color={renk.warn} />
              </View>
              <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }}>Market bütçesi</Text>
            </View>
            <Text style={{ color: renk.textFaint, fontSize: 12.5, fontWeight: "600" }}>Aylık</Text>
          </View>
          <Text style={{ color: renk.text, fontSize: 14, fontWeight: "600", marginTop: SP.md }}>
            {tutarKisa(8200)} ₺ <Text style={{ color: renk.textFaint }}>/ {tutarKisa(10000)} ₺</Text>
          </Text>
          <View style={[s.ray, s.rayKalin, { backgroundColor: renk.hairline }]}>
            <Animated.View
              style={[
                s.rayDolu,
                {
                  backgroundColor: renk.warn,
                  width: bar1.interpolate({ inputRange: [0, 1], outputRange: ["0%", "82%"] }),
                },
              ]}
            />
          </View>
          <Animated.View style={[s.uyariCip, { backgroundColor: renk.warnSoft }, belir(uyari, 6)]}>
            <Ionicons name="alert-circle" size={15} color={renk.warn} />
            <Text style={{ color: renk.warn, fontSize: 12.5, fontWeight: "800" }}>
              Limitin %82'si doldu · {tutarKisa(1800)} ₺ kaldı
            </Text>
          </Animated.View>
        </Kart>
      </Animated.View>

      <Animated.View style={[{ alignSelf: "stretch" }, belir(kart2)]}>
        <Kart>
          <View style={s.satirUst}>
            <View style={s.kartBaslik}>
              <View style={[s.islemIkon, { backgroundColor: renk.successSoft }]}>
                <Ionicons name="flag-outline" size={17} color={renk.success} />
              </View>
              <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }}>Birikim hedefi</Text>
            </View>
            <Text style={{ color: renk.success, fontSize: 13, fontWeight: "800" }}>%60</Text>
          </View>
          <Text style={{ color: renk.text, fontSize: 14, fontWeight: "600", marginTop: SP.md }}>
            {tutarKisa(3000)} ₺ <Text style={{ color: renk.textFaint }}>/ {tutarKisa(5000)} ₺</Text>
          </Text>
          <View style={[s.ray, s.rayKalin, { backgroundColor: renk.hairline }]}>
            <Animated.View
              style={[
                s.rayDolu,
                {
                  backgroundColor: renk.success,
                  width: bar2.interpolate({ inputRange: [0, 1], outputRange: ["0%", "60%"] }),
                },
              ]}
            />
          </View>
          <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: SP.sm }}>
            Hedefine {tutarKisa(2000)} ₺ kaldı 🎯
          </Text>
        </Kart>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 4) Analiz grafiği + akşam özeti bildirimi
// ---------------------------------------------------------------------------

const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DEGERLER = [0.45, 0.7, 0.35, 0.9, 0.55, 1, 0.6];

function Cubuk({ aktif, k }: { aktif: boolean; k: number }) {
  const renk = useRenkler();
  const v = useGiris(aktif, 150 + k * 90, 600);
  const vurgu = k === 5;
  return (
    <View style={s.grafikSutun}>
      <View style={s.grafikAlan}>
        <Animated.View
          style={[
            s.grafikCubuk,
            {
              height: `${DEGERLER[k] * 100}%`,
              backgroundColor: vurgu ? renk.aksan : renk.aksanSoft,
              transformOrigin: "bottom",
              transform: [{ scaleY: v }],
            },
          ]}
        />
      </View>
      <Text style={{ color: vurgu ? renk.aksan : renk.textFaint, fontSize: 11, fontWeight: "700" }}>
        {GUNLER[k]}
      </Text>
    </View>
  );
}

function SahneAnaliz({ aktif }: { aktif: boolean }) {
  const renk = useRenkler();
  const kart = useGiris(aktif, 0);
  const bildirim = useGiris(aktif, 1000, 550);

  return (
    <View style={s.sahneIc}>
      <Animated.View
        style={[
          { alignSelf: "stretch", zIndex: 2 },
          {
            opacity: bildirim,
            transform: [{ translateY: bildirim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          },
        ]}
      >
        <Kart style={s.bildirim}>
          <Image source={LOGO} style={s.bildirimLogo} />
          <View style={{ flex: 1 }}>
            <View style={s.satirUst}>
              <Text style={{ color: renk.textFaint, fontSize: 11.5, fontWeight: "700" }}>Paraİzi</Text>
              <Text style={{ color: renk.textFaint, fontSize: 11.5 }}>21:00</Text>
            </View>
            <Text style={{ color: renk.text, fontSize: 14, fontWeight: "800", marginTop: 2 }}>
              🌙 Bugünün özeti
            </Text>
            <Text style={{ color: renk.textMuted, fontSize: 13, lineHeight: 18 }}>
              Bugün 4 harcama, toplam {tutarKisa(1250)} ₺. En çok: Market
            </Text>
          </View>
        </Kart>
      </Animated.View>

      <Animated.View style={[{ alignSelf: "stretch" }, belir(kart)]}>
        <Kart>
          <View style={s.satirUst}>
            <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }}>Bu hafta</Text>
            <Text style={{ color: renk.success, fontSize: 12.5, fontWeight: "800" }}>
              Geçen haftadan %12 az 👏
            </Text>
          </View>
          <View style={s.grafik}>
            {GUNLER.map((_, k) => (
              <Cubuk key={k} aktif={aktif} k={k} />
            ))}
          </View>
        </Kart>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ustBar: { height: 44, paddingHorizontal: SP.xl, alignItems: "flex-end", justifyContent: "center" },
  slayt: { flex: 1, paddingHorizontal: SP.xl },
  sahne: { flex: 1, justifyContent: "center" },
  sahneIc: { alignItems: "center", gap: SP.lg },
  yazilar: { alignItems: "center", gap: SP.md, paddingTop: SP.md, paddingBottom: SP.sm },
  etiket: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: R.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  metin: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 340 },
  alt: { paddingHorizontal: SP.xl, paddingBottom: SP.lg, paddingTop: SP.sm, gap: SP.lg, alignItems: "center" },
  noktalar: { flexDirection: "row", gap: 7 },
  nokta: { width: 8, height: 8, borderRadius: 4 },
  buton: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: R.pill,
    paddingVertical: 16,
  },

  kart: { borderRadius: R.lg, padding: SP.lg },
  satirUst: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kartBaslik: { flexDirection: "row", alignItems: "center", gap: SP.sm },
  ray: { height: 7, borderRadius: R.pill, overflow: "hidden" },
  rayKalin: { height: 10, marginTop: SP.sm },
  rayDolu: { height: "100%", borderRadius: R.pill },

  logoSar: { borderRadius: 24 },
  logo: { width: 92, height: 92, borderRadius: 24 },

  mikSatir: { flexDirection: "row", alignItems: "center", gap: SP.lg, alignSelf: "stretch" },
  mikSar: { width: 76, height: 76, alignItems: "center", justifyContent: "center" },
  mikHalka: { position: "absolute", width: 76, height: 76, borderRadius: 38 },
  mik: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  dalga: { flexDirection: "row", alignItems: "center", gap: 4, height: 30 },
  dalgaCubuk: { width: 4, height: 30, borderRadius: 2 },
  balon: { alignSelf: "stretch", borderWidth: 1.5, borderTopLeftRadius: 6 },
  aiCip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: R.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  islem: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingVertical: SP.md },
  islemIkon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  uyariCip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: SP.md,
  },

  bildirim: { flexDirection: "row", gap: SP.md, alignItems: "flex-start", padding: SP.md },
  bildirimLogo: { width: 34, height: 34, borderRadius: 9 },
  grafik: { flexDirection: "row", justifyContent: "space-between", marginTop: SP.lg, gap: 8 },
  grafikSutun: { flex: 1, alignItems: "center", gap: 6 },
  grafikAlan: { height: 110, width: "100%", justifyContent: "flex-end" },
  grafikCubuk: { width: "100%", borderRadius: 7 },
});
