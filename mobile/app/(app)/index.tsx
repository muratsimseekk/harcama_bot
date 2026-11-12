import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Kart, Sekmeli, Yukleniyor } from "@/components/base";
import { BaslangicListesi } from "@/components/BaslangicListesi";
import { IcgoruKarti } from "@/components/IcgoruKarti";
import { IlkKayitKarti } from "@/components/IlkKayitKarti";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { PastaGrafik } from "@/components/charts";
import { EkranBasligi } from "@/components/EkranBasligi";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { AY_UZUN, katlaKategori, selamlama, turkceTutar } from "@/lib/format";
import { useHane, useMe, useMevcut, useSummary, useTransactions } from "@/lib/queries";
import { SP, T, useRenkler } from "@/lib/theme";
import { useIslemSil } from "@/lib/islemSil";
import { useTutarGizle } from "@/lib/tutarGizle";
import { kurMetni, SEMBOL, usePara } from "@/lib/paraBirimi";
import type { Granularity, Yon } from "@/lib/types";

const GRAN: Granularity[] = ["week", "month", "year"];
const ETIKET: Record<Granularity, string> = { week: "Haftalık", month: "Aylık", year: "Yıllık" };
const MEVCUT_DONEMLER = ["1", "3", "6", "12"] as const;
type MevcutDonem = (typeof MEVCUT_DONEMLER)[number];
const MEVCUT_ETIKET: Record<MevcutDonem, string> = { "1": "Bu ay", "3": "Son 3 ay", "6": "Son 6 ay", "12": "Son 1 yıl" };

/** "2026-09-01".."2026-11-30" → "Eylül – Kasım 2026"; yıl değişiyorsa ikisi de yazılır. */
function aralikEtiket(bas: string, bit: string): string {
  const [y1, m1] = bas.split("-").map(Number);
  const [y2, m2] = bit.split("-").map(Number);
  if (y1 === y2 && m1 === m2) return `${AY_UZUN[m2 - 1]} ${y2}`;
  return `${AY_UZUN[m1 - 1]}${y1 === y2 ? "" : ` ${y1}`} – ${AY_UZUN[m2 - 1]} ${y2}`;
}

/**
 * Dağılım kartı başlığı — dönemi adıyla söyler: "Eylül ayı harcamaları",
 * "2026 yılı gelirleri". Tarih özetten (baslangic) gelir; henüz yüklenmediyse
 * bugüne düşer.
 */
function dagilimBaslik(gran: Granularity, yon: Yon, baslangic?: string): string {
  const d = baslangic ? new Date(`${baslangic}T00:00:00`) : new Date();
  const ad = yon === "gelir" ? "gelirleri" : "harcamaları";
  if (gran === "month") return `${AY_UZUN[d.getMonth()]} ayı ${ad}`;
  if (gran === "year") return `${d.getFullYear()} yılı ${ad}`;
  return yon === "gelir" ? "Haftalık gelirlerim" : "Haftalık harcamalarım";
}

export default function AnaSayfa() {
  const renk = useRenkler();
  const router = useRouter();
  const islemSil = useIslemSil();
  const [gran, setGran] = useState<Granularity>("month");
  const ozet = useSummary(gran);
  const ayOzet = useSummary("month");
  const sonlar = useTransactions({ limit: 5 });
  const hane = useHane();
  const me = useMe();
  // Hiç kaydı yok: ilk eylem kartı en üstte (bkz components/IlkKayitKarti)
  const yeniHesap = me.data?.toplam_kayit === 0;
  const [mevcutDonem, setMevcutDonem] = useState<MevcutDonem>("3");
  const mevcut = useMevcut(Number(mevcutDonem));
  const { gizli, degistir: gizliDegistir, goster } = useTutarGizle();
  const para = usePara();
  const sb = SEMBOL[para];
  const kur = ayOzet.data?.kur;

  const g = ozet.data?.bu_donem;
  const ay = ayOzet.data?.bu_donem;

  const gunlukOrt = useMemo(() => {
    if (!ay || ay.toplam_gider <= 0) return 0;
    const gun = Math.max(1, new Date().getDate());
    return ay.toplam_gider / gun;
  }, [ay]);

  const dilimler = useMemo(() => katlaKategori(g?.kategori_kirilim ?? []), [g?.kategori_kirilim]);
  const gelirDilimleri = useMemo(() => katlaKategori(g?.gelir_kirilim ?? []), [g?.gelir_kirilim]);

  const detayAc = (d: { ad: string; kategoriler: string[] }, yon: Yon) =>
    router.push({
      pathname: "/kategori-detay",
      params: { ad: d.ad, kategoriler: JSON.stringify(d.kategoriler), yon, gran },
    });

  const net = mevcut.data?.net ?? 0;

  return (
    <EkranBasligi
      baslik=""
      zil
      paraSecici
      onRefresh={() => Promise.all([ozet.refetch(), ayOzet.refetch(), sonlar.refetch(), mevcut.refetch()])}
      ustAlan={
        <View style={s.selam}>
          <Text style={[T.title, { color: renk.text }]}>{selamlama()}</Text>
          <Text style={[s.selamAlt, { color: renk.textMuted }]}>
            {hane.data
              ? `${hane.data.ad} · ${hane.data.uyeler.length} kişi · ortak görünüm`
              : yeniHesap
                ? "Hoş geldin"
                : "Tekrar hoş geldin"}
          </Text>
        </View>
      }
    >
      {yeniHesap && <IlkKayitKarti />}
      <Kart style={{ backgroundColor: renk.aksan }}>
        <View style={s.hcUst}>
          <Text style={[s.hcEtiket, { color: renk.aksanUstu }]}>Bu ay toplam harcama</Text>
          <Pressable
            onPress={gizliDegistir}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={gizli ? "Tutarları göster" : "Tutarları gizle"}
            style={s.gozBtn}
          >
            <Ionicons name={gizli ? "eye-off-outline" : "eye-outline"} size={20} color={renk.aksanUstu} />
          </Pressable>
        </View>
        <Text style={[s.hcDeger, { color: renk.aksanUstu }]}>
          {goster(turkceTutar(ay?.toplam_gider ?? 0))} {sb}
        </Text>
        {para !== "TRY" && kur && (
          <Text style={[s.kurSatir, { color: renk.aksanUstu }]} gizlenmez>
            Her kayıt kendi gününün kuruyla · bugün 1 {sb} = {kurMetni(kur.deger)} ₺
          </Text>
        )}
        <View style={[s.hcAyrac, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
        <View style={s.hcAlt}>
          <View>
            <Text style={[s.miniEtiket, { color: renk.aksanUstu }]}>İşlem</Text>
            <Text style={[s.miniDeger, { color: renk.aksanUstu }]}>{ay?.adet ?? 0}</Text>
          </View>
          <View>
            <Text style={[s.miniEtiket, { color: renk.aksanUstu }]}>Günlük ortalama</Text>
            <Text style={[s.miniDeger, { color: renk.aksanUstu }]}>{goster(turkceTutar(gunlukOrt))} {sb}</Text>
          </View>
        </View>
      </Kart>
      <BaslangicListesi />

      <Kart>
        <Text style={[T.heading, { color: renk.text }]}>Mevcut durum</Text>
        <Text style={[s.mevcutDonem, { color: renk.textFaint }]}>
          {mevcut.data ? `${aralikEtiket(mevcut.data.baslangic, mevcut.data.bitis)} · ` : ""}gelir − gider
        </Text>
        <Sekmeli
          secenekler={MEVCUT_DONEMLER}
          etiket={(x) => MEVCUT_ETIKET[x]}
          secili={mevcutDonem}
          onSec={setMevcutDonem}
          kucuk
        />
        <View style={[s.mevcutSatir, { marginTop: SP.md }]}>
          <Text style={[s.mevcutEtiket, { color: renk.textMuted }]}>Gelir</Text>
          <Text style={[s.mevcutTutar, { color: renk.success }]}>{gizli ? "" : "+"}{goster(turkceTutar(mevcut.data?.gelir ?? 0))} {sb}</Text>
        </View>
        <View style={s.mevcutSatir}>
          <Text style={[s.mevcutEtiket, { color: renk.textMuted }]}>Gider</Text>
          <Text style={[s.mevcutTutar, { color: renk.blue }]}>{gizli ? "" : "−"}{goster(turkceTutar(mevcut.data?.gider ?? 0))} {sb}</Text>
        </View>
        <View style={[s.mevcutAyrac, { backgroundColor: renk.hairline }]} />
        <View style={s.mevcutSatir}>
          <Text style={[s.mevcutEtiket, { color: renk.text, fontWeight: "700" }]}>Mevcut</Text>
          <Text style={[s.mevcutNet, { color: gizli ? renk.text : net < 0 ? renk.danger : renk.success }]}>
            {net < 0 && !gizli ? "−" : ""}
            {goster(turkceTutar(Math.abs(net)))} {sb}
          </Text>
        </View>
      </Kart>

      <IcgoruKarti />

      <Sekmeli secenekler={GRAN} etiket={(x) => ETIKET[x]} secili={gran} onSec={setGran} />

      <Kart>
        <Text style={[T.heading, { color: renk.text }]}>
          {dagilimBaslik(gran, "gider", ozet.data?.baslangic)}
        </Text>
        <Text style={[s.detayIpucu, { color: renk.textFaint }]}>
          {dilimler.length > 0 ? "Detayını görmek için kategoriye dokun" : " "}
        </Text>
        {ozet.isLoading ? (
          <YuklemeHalkasi boyut={64} yukseklik={190} />
        ) : (
          <PastaGrafik dilimler={dilimler} onDilimSec={(d) => detayAc(d, "gider")} />
        )}
      </Kart>

      {gelirDilimleri.length > 0 && (
        <Kart>
          <Text style={[T.heading, { color: renk.text, marginBottom: SP.md }]}>
            {dagilimBaslik(gran, "gelir", ozet.data?.baslangic)}
          </Text>
          <PastaGrafik dilimler={gelirDilimleri} onDilimSec={(d) => detayAc(d, "gelir")} />
        </Kart>
      )}

      <Text style={[T.heading, { color: renk.text, marginTop: SP.xs }]}>Son işlemler</Text>

      {sonlar.isLoading ? (
        <Yukleniyor yukseklik={120} />
      ) : (
        <View>
          {(sonlar.data ?? []).map((t) => (
            <IslemSatiri
              key={t.id}
              islem={t}
              onPress={() => router.push({ pathname: "/islem-form", params: { islem: JSON.stringify(t) } })}
              onSil={() => islemSil(t, "ana-sayfa")}
            />
          ))}
          {(sonlar.data ?? []).length === 0 && (
            <Text style={{ color: renk.textFaint, textAlign: "center", paddingVertical: SP.xl }}>
              Kayıtların burada görünecek. Yukarıdaki mikrofona dokunup "kahve 90" demen yeter.
            </Text>
          )}
        </View>
      )}
    </EkranBasligi>
  );
}

const s = StyleSheet.create({
  selam: {},
  selamAlt: { fontSize: 13, fontWeight: "500", marginTop: -2 },
  kurSatir: { fontSize: 11.5, fontWeight: "600", opacity: 0.85, marginTop: 2 },
  hcUst: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gozBtn: { padding: 2, opacity: 0.9 },
  hcEtiket: { fontSize: 13, fontWeight: "600" },
  hcDeger: { fontSize: 30, fontWeight: "800", marginTop: 2, letterSpacing: -0.6 },
  hcAyrac: { height: 1, marginVertical: SP.md },
  hcAlt: { flexDirection: "row", justifyContent: "space-between" },
  miniEtiket: { fontSize: 12, fontWeight: "500" },
  miniDeger: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  mevcutDonem: { fontSize: 12.5, fontWeight: "500", marginTop: 2, marginBottom: SP.md },
  mevcutSatir: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  mevcutEtiket: { fontSize: 14, fontWeight: "600" },
  mevcutTutar: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  mevcutAyrac: { height: 1, marginVertical: SP.sm },
  mevcutNet: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
  detayIpucu: { fontSize: 12.5, fontWeight: "500", marginTop: 2, marginBottom: SP.md },
});
