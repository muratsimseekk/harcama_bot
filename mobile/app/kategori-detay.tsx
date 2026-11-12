import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Kart, Sekmeli } from "@/components/base";
import { IslemSatiri } from "@/components/IslemSatiri";
import { DegisimRozeti } from "@/components/KategoriKiyas";
import { Metin as Text } from "@/components/Metin";
import { type Aralik, kisaTarih, TarihAraligi, varsayilanAralik } from "@/components/TarihAraligi";
import { TutarDialog } from "@/components/TutarDialog";
import { useUyari } from "@/components/Uyari";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { hataMesaji } from "@/lib/hata";
import { tarihEtiket, turkceTutar, tutarKisa } from "@/lib/format";
import { islemTutari, paraMetni, usePara } from "@/lib/paraBirimi";
import { useIslemSil } from "@/lib/islemSil";
import {
  useBudgets,
  useDeleteBudget,
  useKategoriKiyas,
  useKategoriTrend,
  useSetBudget,
  useSummary,
  useTransactions,
} from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
import { MASKE, useGizli } from "@/lib/tutarGizle";
import type { Granularity, Islem, Yon } from "@/lib/types";

type Sekme = Granularity | "ozel";
const SEKMELER: Sekme[] = ["week", "month", "year", "ozel"];
const ETIKET: Record<Sekme, string> = { week: "Haftalık", month: "Aylık", year: "Yıllık", ozel: "Özel" };
const SAYFA = 50; // işlem listesi parça büyüklüğü
const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/**
 * Bir kategorinin (ya da katlanmış "Diğer"in) seçilen dönemdeki kayıtları + önceki döneme
 * göre değişim + son 6 ayın trendi. Analiz'den tarih aralığıyla (bas/bit), ana sayfadan
 * dönemle (gran) açılır.
 */
export default function KategoriDetay() {
  const renk = useRenkler();
  const router = useRouter();
  const islemSil = useIslemSil();
  const p = useLocalSearchParams<{
    ad: string;
    kategoriler: string;
    yon: Yon;
    gran?: Granularity;
    bas?: string;
    bit?: string;
  }>();
  const kategoriler = useMemo<string[]>(() => JSON.parse(String(p.kategoriler)), [p.kategoriler]);
  const yon: Yon = p.yon === "gelir" ? "gelir" : "gider";
  const [sekme, setSekme] = useState<Sekme>(p.bas && p.bit ? "ozel" : (p.gran ?? "month"));
  const [aralik, setAralik] = useState<Aralik>(() =>
    p.bas && p.bit ? { bas: String(p.bas), bit: String(p.bit) } : varsayilanAralik(),
  );
  const ozel = sekme === "ozel";

  // Aylık limit kartı: yalnız tek bir gider kategorisinde (katlanmış "Diğer" grubunda değil)
  const limitGoster = yon === "gider" && kategoriler.length === 1;
  const uyari = useUyari();
  const butceler = useBudgets();
  const ayOzet = useSummary("month", undefined, "TRY"); // limitler TL
  const setBudget = useSetBudget();
  const delBudget = useDeleteBudget();
  const [limitAcik, setLimitAcik] = useState(false);
  const limit = butceler.data?.find((b) => b.kapsam === "kategori" && b.kapsam_deger === kategoriler[0]);
  const limitIlerleme = ayOzet.data?.hedefler.find((h) => h.kapsam === "kategori" && h.kapsam_deger === kategoriler[0]);

  const ozet = useSummary(ozel ? "month" : sekme);
  const bas = ozel ? aralik.bas : ozet.data?.baslangic;
  const bit = ozel ? aralik.bit : ozet.data?.bitis;

  const liste = useTransactions(
    { limit: 500, from: bas, to: bit, direction: yon, kategoriler },
    { enabled: !!bas && !!bit },
  );
  const kiyas = useKategoriKiyas(bas, bit);
  const trend = useKategoriTrend(kategoriler, yon, 6);

  const para = usePara();
  const gizli = useGizli(); // trenddeki kısa tutarlar ("450") sembolsüz: elle maskele
  const kayitlar = liste.data ?? [];

  // Toplam ve önceki dönem: sunucudaki kıyastan (tam toplam, kendi günü kuruyla çevrilmiş).
  const kiyasOzet = useMemo(() => {
    const d = kiyas.data;
    if (!d) return null;
    const satirlar = d[yon].kategoriler.filter((k) => kategoriler.includes(k.kategori));
    const tutar = satirlar.reduce((t, k) => t + k.tutar, 0);
    const onceki = satirlar.reduce((t, k) => t + k.onceki_tutar, 0);
    const adet = satirlar.reduce((t, k) => t + k.adet, 0);
    const degisim = onceki > 0 ? ((tutar - onceki) / onceki) * 100 : null;
    return { tutar, onceki, adet, degisim, obas: d.onceki_baslangic, obit: d.onceki_bitis };
  }, [kiyas.data, kategoriler, yon]);

  // Kıyas gelmeden: listedeki kayıtlardan (döviz modunda çevrilemeyen varsa TL)
  const dovizli = para !== "TRY" && kayitlar.every((x) => x.cevrilmis != null);
  const yedekToplam = kayitlar.reduce((t, x) => t + (dovizli ? islemTutari(x, para).deger : x.tutar), 0);
  const toplam = kiyasOzet?.tutar ?? yedekToplam;
  const toplamPara = kiyasOzet ? para : dovizli ? para : "TRY";

  const [gosterilen, setGosterilen] = useState(SAYFA);
  useEffect(() => setGosterilen(SAYFA), [bas, bit]);
  const tumIslemler = useMemo(
    () => [...(liste.data ?? [])].sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0)),
    [liste.data],
  );
  const bolumler = useMemo(() => {
    const map = new Map<string, Islem[]>();
    for (const t of tumIslemler.slice(0, gosterilen)) {
      if (!map.has(t.tarih)) map.set(t.tarih, []);
      map.get(t.tarih)!.push(t);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [tumIslemler, gosterilen]);

  // Dönem/aralık değişince eski veri yer tutucu kalır: o sırada da spinner göster.
  const listeYenileniyor = liste.isFetching && liste.isPlaceholderData;
  const kiyasYenileniyor = kiyas.isFetching && kiyas.isPlaceholderData;
  const yukleniyor = (!ozel && ozet.isLoading) || liste.isLoading || listeYenileniyor;
  const aylar = trend.data?.aylar ?? [];
  const enBuyuk = Math.max(1, ...aylar.map((a) => a.tutar));
  // Limit önerisi: içinde bulunulan ay hariç son 3 tam ayın ortalaması (TL'de — limitler TL)
  const tamAylar = aylar.slice(-4, -1);
  const ortalama3 =
    para === "TRY" && tamAylar.length ? tamAylar.reduce((t, a) => t + a.tutar, 0) / tamAylar.length : 0;
  const vurgu = yon === "gelir" ? renk.success : renk.aksan;

  return (
    <ScrollView
      style={{ backgroundColor: renk.bg }}
      contentContainerStyle={s.icerik}
      refreshControl={
        <RefreshControl
          refreshing={liste.isRefetching}
          onRefresh={() => Promise.all([liste.refetch(), kiyas.refetch(), trend.refetch()])}
          tintColor={renk.aksan}
        />
      }
    >
      <Stack.Screen options={{ title: String(p.ad) }} />
      <Sekmeli secenekler={SEKMELER} etiket={(x) => ETIKET[x]} secili={sekme} onSec={setSekme} kucuk />

      {ozel && (
        <Kart>
          <TarihAraligi deger={aralik} onChange={setAralik} />
        </Kart>
      )}

      <Kart>
        {(kiyasYenileniyor || listeYenileniyor) && (
          <ActivityIndicator style={s.koseSpinner} size="small" color={renk.aksan} />
        )}
        <Text style={[s.etiket, { color: renk.textMuted }]}>
          {bas && bit ? `${kisaTarih(bas)} – ${kisaTarih(bit)}` : "…"} ·{" "}
          {yon === "gelir" ? "toplam gelir" : "toplam harcama"}
        </Text>
        <Text style={[s.toplam, { color: yon === "gelir" ? renk.success : renk.text }]}>
          {paraMetni(toplam, toplamPara)}
        </Text>
        <Text style={[s.adet, { color: renk.textFaint }]}>{kiyasOzet?.adet ?? kayitlar.length} kayıt</Text>
        {kiyasOzet && (
          <View style={[s.kiyas, { borderTopColor: renk.hairline }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>Önceki dönem</Text>
              <Text style={{ color: renk.textFaint, fontSize: 12 }}>
                {kisaTarih(kiyasOzet.obas)} – {kisaTarih(kiyasOzet.obit)}
              </Text>
              <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700", marginTop: 2 }}>
                {paraMetni(kiyasOzet.onceki, para)}
              </Text>
            </View>
            <DegisimRozeti degisim={kiyasOzet.degisim} yon={yon} buyuk />
          </View>
        )}
      </Kart>

      {limitGoster && !butceler.isLoading && (
        <Kart>
          {limit ? (
            <View style={{ gap: SP.sm }}>
              <View style={s.limitUst}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>Aylık limit</Text>
                  <Text style={{ color: renk.text, fontSize: 16, fontWeight: "800", marginTop: 1 }}>
                    {turkceTutar(limitIlerleme?.harcanan ?? 0)} / {turkceTutar(limit.limit_amount)} ₺
                  </Text>
                </View>
                <Pressable onPress={() => setLimitAcik(true)} hitSlop={8} style={[s.miniBtn, { backgroundColor: renk.cardAlt }]}>
                  <Text style={{ color: renk.text, fontSize: 12.5, fontWeight: "700" }}>Değiştir</Text>
                </Pressable>
                <Pressable
                  hitSlop={8}
                  disabled={delBudget.isPending}
                  onPress={() =>
                    uyari(`${kategoriler[0]} limiti`, "Aylık limit kaldırılsın mı?", [
                      { yazi: "Vazgeç", stil: "vazgec" },
                      {
                        yazi: "Kaldır",
                        stil: "tehlike",
                        onPress: () =>
                          delBudget.mutate(limit.id, {
                            onError: (e) => uyari("Kaldırılamadı", hataMesaji(e, undefined, { ekran: "kategori-detay" })),
                          }),
                      },
                    ])
                  }
                >
                  {delBudget.isPending ? (
                    <ActivityIndicator size="small" color={renk.textFaint} />
                  ) : (
                    <Ionicons name="close-circle" size={22} color={renk.textFaint} />
                  )}
                </Pressable>
              </View>
              <View style={[s.limitRay, { backgroundColor: renk.hairline }]}>
                <View
                  style={{
                    width: `${Math.min(100, Math.max(2, limitIlerleme?.oran ?? 0))}%`,
                    height: "100%",
                    borderRadius: R.pill,
                    backgroundColor:
                      limitIlerleme?.durum === "asti"
                        ? renk.danger
                        : limitIlerleme?.durum === "yaklasti"
                          ? renk.warn
                          : renk.aksan,
                  }}
                />
              </View>
              <Text style={{ color: renk.textFaint, fontSize: 12 }}>
                Bu ay %{Math.round(limitIlerleme?.oran ?? 0)} kullanıldı
                {limitIlerleme && limitIlerleme.limit > limitIlerleme.harcanan
                  ? ` · ${turkceTutar(limitIlerleme.limit - limitIlerleme.harcanan)} ₺ kaldı`
                  : ""}
              </Text>
            </View>
          ) : (
            <Pressable onPress={() => setLimitAcik(true)} style={s.limitYok}>
              <View style={[s.limitIkon, { backgroundColor: renk.aksanSoft }]}>
                <Ionicons name="flag-outline" size={18} color={renk.aksan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }}>Bu kategoriye aylık limit koy</Text>
                <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 2 }}>
                  {ortalama3 > 0
                    ? `Son 3 ay ortalaman ${turkceTutar(ortalama3)} ₺ · aşınca haber veririz`
                    : "Limite yaklaşınca ve aşınca haber veririz"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />
            </Pressable>
          )}
        </Kart>
      )}

      <TutarDialog
        acik={limitAcik}
        baslik={`${String(p.ad)} — aylık limit`}
        aciklama={ortalama3 > 0 ? `Son 3 ayın ortalaması: ${turkceTutar(ortalama3)} ₺` : undefined}
        baslangic={limit?.limit_amount ?? (ortalama3 > 0 ? Math.round(ortalama3) : undefined)}
        onKapat={() => setLimitAcik(false)}
        kaydet={(n) =>
          setBudget
            .mutateAsync({ kapsam: "kategori", kapsam_deger: kategoriler[0], limit_amount: n })
            .then(
              () => {},
              (e) => uyari("Kaydedilemedi", hataMesaji(e, undefined, { ekran: "kategori-detay" })),
            )
        }
      />

      <Kart>
        <Text style={[T.heading, { color: renk.text }]}>Son 6 ay</Text>
        <Text style={{ color: renk.textFaint, fontSize: 12, marginTop: 2, marginBottom: SP.md }}>
          Her ay bir önceki aya göre değişim
        </Text>
        {!trend.data ? (
          <YuklemeHalkasi boyut={40} yukseklik={150} />
        ) : (
          <View style={s.trend}>
            {aylar.map((a, i) => {
              const son = i === aylar.length - 1;
              const ay = Number(a.ay.slice(5, 7)) - 1;
              const artis = a.degisim != null && a.degisim > 0;
              const iyi = yon === "gider" ? !artis : artis;
              return (
                <View key={a.ay} style={s.trendSutun}>
                  <Text style={[s.trendTutar, { color: son ? renk.text : renk.textMuted }]} numberOfLines={1}>
                    {a.tutar > 0 ? (gizli ? MASKE : tutarKisa(a.tutar)) : "–"}
                  </Text>
                  <View style={s.trendAlan}>
                    <View
                      style={{
                        height: `${Math.max(a.tutar > 0 ? 4 : 0, (a.tutar / enBuyuk) * 100)}%`,
                        width: "70%",
                        borderRadius: 8,
                        backgroundColor: son ? vurgu : renk.textFaint,
                        opacity: son ? 1 : 0.45,
                      }}
                    />
                  </View>
                  <Text style={{ color: son ? renk.text : renk.textMuted, fontSize: 12, fontWeight: "700" }}>
                    {AYLAR[ay]}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: "800",
                      color:
                        a.degisim == null || Math.round(a.degisim) === 0
                          ? renk.textFaint
                          : iyi
                            ? renk.success
                            : renk.danger,
                    }}
                  >
                    {a.degisim == null ? "·" : `${a.degisim > 0 ? "↑" : a.degisim < 0 ? "↓" : ""}%${Math.round(Math.abs(a.degisim))}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Kart>

      {yukleniyor ? (
        <YuklemeHalkasi boyut={64} yukseklik={190} yazi="Kayıtlar yükleniyor" />
      ) : (
        <View>
          {bolumler.map(([tarih, gunluk]) => (
            <View key={tarih}>
              <Text style={[s.gunBaslik, { color: renk.textMuted }]}>{tarihEtiket(tarih)}</Text>
              {gunluk.map((t) => (
                <IslemSatiri
                  key={t.id}
                  islem={t}
                  onPress={() => router.push({ pathname: "/islem-form", params: { islem: JSON.stringify(t) } })}
                  onSil={() => islemSil(t, "kategori-detay")}
                />
              ))}
            </View>
          ))}
          {tumIslemler.length > gosterilen && (
            <Pressable
              onPress={() => setGosterilen((n) => n + SAYFA)}
              style={[s.dahaFazla, { borderColor: renk.border, backgroundColor: renk.card }]}
            >
              <Text style={{ color: renk.text, fontWeight: "700" }}>
                Daha fazla göster ({tumIslemler.length - gosterilen} kayıt daha)
              </Text>
            </Pressable>
          )}
          {bolumler.length === 0 && (
            <Text style={[T.body, { color: renk.textFaint, textAlign: "center", paddingVertical: SP.xl }]}>
              Bu dönemde kayıt yok.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.md, paddingBottom: 60 },
  etiket: { fontSize: 13, fontWeight: "600" },
  toplam: { fontSize: 28, fontWeight: "800", marginTop: 2, letterSpacing: -0.5 },
  adet: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  kiyas: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    marginTop: SP.md,
    paddingTop: SP.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  trend: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  trendSutun: { flex: 1, alignItems: "center", gap: 4 },
  trendTutar: { fontSize: 10.5, fontWeight: "700" },
  trendAlan: { height: 110, width: "100%", justifyContent: "flex-end", alignItems: "center", borderRadius: R.sm },
  gunBaslik: { fontSize: 13, fontWeight: "700", marginTop: SP.md, marginBottom: 2 },
  limitUst: { flexDirection: "row", alignItems: "center", gap: SP.md },
  limitRay: { height: 8, borderRadius: R.pill, overflow: "hidden" },
  limitYok: { flexDirection: "row", alignItems: "center", gap: SP.md },
  limitIkon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  miniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
  koseSpinner: { position: "absolute", top: SP.md, right: SP.md },
  dahaFazla: { marginTop: SP.md, borderWidth: 1, borderRadius: R.pill, paddingVertical: 11, alignItems: "center" },
});
