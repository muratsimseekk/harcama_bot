import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Kart, Sekmeli } from "@/components/base";
import { IkiliCubukGrafik } from "@/components/charts";
import { DegisimRozeti, KategoriKiyasListesi } from "@/components/KategoriKiyas";
import { type Aralik, kisaTarih, TarihAraligi, varsayilanAralik } from "@/components/TarihAraligi";
import { islemTutari, SEMBOL, usePara } from "@/lib/paraBirimi";
import { EkranBasligi } from "@/components/EkranBasligi";
import { IlerlemeCubugu } from "@/components/IlerlemeCubugu";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { turkceTutar } from "@/lib/format";
import { useKategoriKiyas, useSummary, useTransactions } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
import type { Granularity, Islem, Yon } from "@/lib/types";

type Sekme = "day" | "week" | "month" | "year" | "ozel";
const ETIKET: Record<Sekme, string> = { day: "Günlük", week: "Haftalık", month: "Aylık", year: "Yıllık", ozel: "Özel" };
const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const AY_UZUN = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const GUNLER = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const SAYFA = 50; // işlem listesi parça büyüklüğü

function tarihUzun(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${AY_UZUN[m - 1]} ${y}`;
}

/** "2026-09-08" → "Pzt" */
function gunAdi(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return GUNLER[new Date(y, m - 1, d).getDay()];
}

function granOf(s: Sekme): Granularity {
  if (s === "ozel") return "month"; // özel aralıkta özet yalnız hedef kartı için (bu ay)
  return s === "day" ? "week" : (s as Granularity);
}

/** "2026-09-28".."2026-10-04" → her gün için ISO tarih (yerel saat, UTC kayması yok). */
function gunAraligi(bas?: string, bit?: string): string[] {
  if (!bas || !bit) return [];
  const [y1, m1, d1] = bas.split("-").map(Number);
  const [y2, m2, d2] = bit.split("-").map(Number);
  const son = new Date(y2, m2 - 1, d2);
  const sonuc: string[] = [];
  for (let d = new Date(y1, m1 - 1, d1); d <= son && sonuc.length < 400; d.setDate(d.getDate() + 1)) {
    sonuc.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return sonuc;
}

export default function Analiz() {
  const renk = useRenkler();
  const router = useRouter();
  const [sekme, setSekme] = useState<Sekme>("month");
  const [aralik, setAralik] = useState<Aralik>(varsayilanAralik);
  const [katYon, setKatYon] = useState<Yon>("gider");
  const ozel = sekme === "ozel";
  const gran = granOf(sekme);

  const ozet = useSummary(gran);
  const para = usePara();
  const g = ozet.data?.bu_donem;
  // Gösterilen aralık: özelde seçilen tarihler, değilse özetin dönemi.
  const bas = ozel ? aralik.bas : ozet.data?.baslangic;
  const bit = ozel ? aralik.bit : ozet.data?.bitis;
  // Tarih aralığı belli olmadan sorgu atılırsa tarihsiz (başka dönemin) kayıtları görünür.
  const txQ = useTransactions({ limit: 500, from: bas, to: bit }, { enabled: !!bas && !!bit });
  const kiyas = useKategoriKiyas(bas, bit);
  // Dönem/aralık değişince eski veri yer tutucu olarak kalır: o sırada da spinner göster.
  const txYenileniyor = txQ.isFetching && txQ.isPlaceholderData;
  const kiyasYenileniyor = !kiyas.data || (kiyas.isFetching && kiyas.isPlaceholderData);
  const ozetYenileniyor = !ozel && ozet.isFetching && ozet.isPlaceholderData;
  const islemlerYukleniyor = (!ozel && ozet.isLoading) || txQ.isLoading || txYenileniyor;
  // Çok kayıtta (yıllık ~500) hepsini birden çizmek ekranı donduruyordu: parça parça göster.
  const [gosterilen, setGosterilen] = useState(SAYFA);
  useEffect(() => setGosterilen(SAYFA), [bas, bit]);

  const toplamGelir = ozel ? kiyas.data?.gelir.toplam : g?.toplam_gelir;
  const toplamGider = ozel ? kiyas.data?.gider.toplam : g?.toplam_gider;

  const grafik = useMemo(() => {
    if (ozel) {
      // Özel aralık: grafiği kayıtlardan kur (≤ 62 gün günlük, daha uzunsa aylık çubuk).
      const gunler = gunAraligi(aralik.bas, aralik.bit);
      const aylik = gunler.length > 62;
      const anahtar = (t: string) => (aylik ? t.slice(0, 7) : t);
      const kovalar = [...new Set(gunler.map(anahtar))];
      const sira = new Map(kovalar.map((k, i) => [k, i]));
      const gelir: number[] = Array(kovalar.length).fill(0);
      const gider: number[] = Array(kovalar.length).fill(0);
      for (const t of txQ.data ?? []) {
        const i = sira.get(anahtar(t.tarih));
        if (i == null) continue;
        const v = islemTutari(t, para).deger;
        if (t.direction === "gelir") gelir[i] += v;
        else gider[i] += v;
      }
      const etiketler = aylik
        ? kovalar.map((k) => AYLAR[Number(k.slice(5, 7)) - 1])
        : kovalar.map((k, i) => {
            const gun = Number(k.slice(8, 10));
            if (kovalar.length <= 7) return gunAdi(k);
            return i === 0 || gun === 1 || gun % 5 === 0 ? String(gun) : "";
          });
      return { etiketler, gelir, gider };
    }
    if (!g) return { etiketler: [] as string[], gelir: [] as number[], gider: [] as number[] };
    if (gran === "year") {
      const gg = Array(12).fill(0);
      const ge = Array(12).fill(0);
      for (const gn of g.gunluk) {
        const m = Number(gn.tarih.slice(5, 7)) - 1;
        gg[m] += gn.gelir;
        ge[m] += gn.gider;
      }
      return { etiketler: AYLAR, gelir: gg, gider: ge };
    }
    // API yalnız kaydı olan günleri döndürür → dönemin TÜM günlerini üret, boşları 0 yap
    // (yoksa haftalıkta kayıtsız Salı düşüyor, aylıkta tek çubuk kalıyordu).
    const gunler = gunAraligi(ozet.data?.baslangic, ozet.data?.bitis);
    const harita = new Map(g.gunluk.map((x) => [x.tarih, x]));
    const gelir = gunler.map((t) => harita.get(t)?.gelir ?? 0);
    const gider = gunler.map((t) => harita.get(t)?.gider ?? 0);
    if (gran === "week") {
      // 7 gün → hafta günü kısaltması (Pzt, Sal…) — "1.9" gibi tarih kodu değil
      return { etiketler: gunler.map(gunAdi), gelir, gider };
    }
    // Aylık: ~30 çubuk. Her güne etiket sığmaz → sadece 1, 5, 10, 15, 20, 25, 30
    return {
      etiketler: gunler.map((t) => {
        const gun = Number(t.slice(8, 10));
        return gun === 1 || gun % 5 === 0 ? String(gun) : "";
      }),
      gelir,
      gider,
    };
  }, [g, gran, ozet.data?.baslangic, ozet.data?.bitis, ozel, aralik, txQ.data, para]);

  const tumIslemler = useMemo(
    () => [...(txQ.data ?? [])].sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0)),
    [txQ.data],
  );
  const bolumler = useMemo(() => {
    const map = new Map<string, Islem[]>();
    for (const t of tumIslemler.slice(0, gosterilen)) {
      if (!map.has(t.tarih)) map.set(t.tarih, []);
      map.get(t.tarih)!.push(t);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [tumIslemler, gosterilen]);

  const genelHedef = ozet.data?.hedefler.find((h) => h.kapsam === "genel");
  const katHedefler = (ozet.data?.hedefler ?? []).filter((h) => h.kapsam !== "genel");

  const islemAc = (t: Islem) =>
    router.push({ pathname: "/islem-form", params: { islem: JSON.stringify(t) } });

  return (
    <EkranBasligi
      baslik="Analiz"
      paraSecici
      onRefresh={() => Promise.all([ozet.refetch(), txQ.refetch(), kiyas.refetch()])}
      ustAlan={
        toplamGelir != null && toplamGider != null ? (
          <View style={{ gap: SP.md }}>
            <View style={s.ggSatir}>
              <View>
                <Text style={[s.ggEtiket, { color: renk.textMuted }]}>↗ Gelir</Text>
                <Text style={[s.ggDeger, { color: renk.success }]}>{turkceTutar(toplamGelir)} {SEMBOL[para]}</Text>
              </View>
              <View style={[s.ggAyrac, { backgroundColor: renk.hairline }]} />
              <View>
                <Text style={[s.ggEtiket, { color: renk.textMuted }]}>↘ Harcama</Text>
                <Text style={[s.ggDeger, { color: renk.blue }]}>-{turkceTutar(toplamGider)} {SEMBOL[para]}</Text>
              </View>
            </View>
            {!ozel && genelHedef && <IlerlemeCubugu oran={genelHedef.oran} hedef={genelHedef.limit} />}
          </View>
        ) : undefined
      }
    >
      <Sekmeli
        secenekler={["day", "week", "month", "year", "ozel"] as const}
        etiket={(x) => ETIKET[x]}
        secili={sekme}
        onSec={setSekme}
        kucuk
      />

      {ozel && (
        <Kart>
          <TarihAraligi deger={aralik} onChange={setAralik} />
        </Kart>
      )}

      <Kart style={{ backgroundColor: renk.aksanSoft }}>
        <View style={s.grafikBaslik}>
          <View style={s.baslikSol}>
            <Text style={[T.heading, { color: renk.text }]}>Gelir & Gider</Text>
            {(ozetYenileniyor || (ozel && txYenileniyor)) && <ActivityIndicator size="small" color={renk.aksan} />}
          </View>
          <Pressable
            onPress={() => router.navigate("/ara")}
            style={[s.yesilBtn, { backgroundColor: renk.aksan }]}
          >
            <Ionicons name="search" size={16} color={renk.aksanUstu} />
          </Pressable>
        </View>
        <IkiliCubukGrafik etiketler={grafik.etiketler} gelir={grafik.gelir} gider={grafik.gider} />
      </Kart>

      <Kart>
        <View style={s.grafikBaslik}>
          <View style={{ flex: 1 }}>
            <Text style={[T.heading, { color: renk.text }]}>Kategoriler</Text>
            {kiyas.data && (
              <Text style={{ color: renk.textFaint, fontSize: 12, marginTop: 2 }}>
                Kıyas: {kisaTarih(kiyas.data.onceki_baslangic)} – {kisaTarih(kiyas.data.onceki_bitis)}
              </Text>
            )}
          </View>
          <View style={{ width: 140 }}>
            <Sekmeli
              secenekler={["gider", "gelir"] as const}
              etiket={(x) => (x === "gider" ? "Gider" : "Gelir")}
              secili={katYon}
              onSec={setKatYon}
              kucuk
            />
          </View>
        </View>
        {kiyasYenileniyor ? (
          kiyas.isError ? (
            <Text style={{ color: renk.textFaint, textAlign: "center", paddingVertical: SP.lg }}>
              Kategoriler yüklenemedi. Yenilemek için aşağı çek.
            </Text>
          ) : (
            <YuklemeHalkasi boyut={40} yukseklik={100} yazi="Kategoriler hesaplanıyor" />
          )
        ) : (
          <View style={{ gap: SP.sm }}>
            <View style={[s.kiyasOzet, { backgroundColor: renk.cardAlt }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: renk.textMuted, fontSize: 12, fontWeight: "600" }}>
                  Toplam {katYon === "gider" ? "harcama" : "gelir"} / önceki dönem
                </Text>
                <Text style={{ color: renk.text, fontSize: 15, fontWeight: "800", marginTop: 2 }}>
                  {turkceTutar(kiyas.data![katYon].toplam)} {SEMBOL[para]}
                  <Text style={{ color: renk.textFaint, fontSize: 13, fontWeight: "600" }}>
                    {"  / "}
                    {turkceTutar(kiyas.data![katYon].onceki_toplam)} {SEMBOL[para]}
                  </Text>
                </Text>
              </View>
              <DegisimRozeti degisim={kiyas.data![katYon].degisim} yon={katYon} buyuk />
            </View>
            <KategoriKiyasListesi
              veri={kiyas.data![katYon]}
              yon={katYon}
              para={para}
              onSec={(k) =>
                router.push({
                  pathname: "/kategori-detay",
                  params: {
                    ad: k.kategori,
                    kategoriler: JSON.stringify([k.kategori]),
                    yon: katYon,
                    bas: kiyas.data!.baslangic,
                    bit: kiyas.data!.bitis,
                  },
                })
              }
            />
          </View>
        )}
      </Kart>

      {katHedefler.length > 0 ? (
        <Kart onPress={() => router.navigate("/(app)/hedefler")}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md }}>
            <Text style={[T.heading, { color: renk.text }]}>Hedeflerim</Text>
            <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />
          </View>
          <View style={{ gap: SP.md }}>
            {katHedefler.map((h) => (
              <View key={`${h.kapsam}-${h.kapsam_deger}`} style={{ gap: 6 }}>
                <View style={s.hedefUst}>
                  <Text style={{ color: renk.text, fontWeight: "600", fontSize: 14 }}>{h.etiket}</Text>
                  <Text style={{ color: renk.textMuted, fontSize: 12.5 }}>
                    {turkceTutar(h.harcanan)} / {turkceTutar(h.limit)} ₺
                  </Text>
                </View>
                <View style={[s.hedefRay, { backgroundColor: renk.hairline }]}>
                  <View
                    style={{
                      width: `${Math.min(100, Math.max(3, h.oran))}%`,
                      height: "100%",
                      borderRadius: R.pill,
                      backgroundColor:
                        h.durum === "asti" ? renk.danger : h.durum === "yaklasti" ? renk.warn : renk.aksan,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </Kart>
      ) : (
        <Kart onPress={() => router.navigate("/(app)/hedefler")}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={[T.heading, { color: renk.text }]}>Hedeflerim</Text>
              <Text style={{ color: renk.textFaint, fontSize: 13, marginTop: 2 }}>
                Aylık bütçe ve kategori limitleri koy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />
          </View>
        </Kart>
      )}

      {islemlerYukleniyor ? (
        <Kart>
          <YuklemeHalkasi boyut={48} yukseklik={120} yazi="İşlemler yükleniyor" />
        </Kart>
      ) : (
        <View>
          {bolumler.map(([tarih, list]) => (
            <View key={tarih}>
              <Text style={[s.gunBaslik, { color: renk.textMuted }]}>{tarihUzun(tarih)}</Text>
              {list.map((t) => (
                <IslemSatiri key={t.id} islem={t} onPress={() => islemAc(t)} />
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
            <Text style={{ color: renk.textFaint, textAlign: "center", paddingVertical: SP.xl }}>
              {ozet.isError || txQ.isError
                ? "İşlemler yüklenemedi. Yenilemek için aşağı çek."
                : "Bu dönemde işlem yok."}
            </Text>
          )}
        </View>
      )}
    </EkranBasligi>
  );
}

const s = StyleSheet.create({
  ggSatir: { flexDirection: "row", alignItems: "center", gap: SP.lg },
  ggEtiket: { fontSize: 12.5, fontWeight: "600" },
  ggDeger: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  ggAyrac: { width: 1, height: 34 },
  grafikBaslik: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SP.md,
  },
  yesilBtn: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  hedefUst: { flexDirection: "row", justifyContent: "space-between" },
  hedefRay: { height: 8, borderRadius: R.pill, overflow: "hidden" },
  baslikSol: { flexDirection: "row", alignItems: "center", gap: SP.sm },
  dahaFazla: {
    marginTop: SP.md,
    borderWidth: 1,
    borderRadius: R.pill,
    paddingVertical: 11,
    alignItems: "center",
  },
  kiyasOzet: { flexDirection: "row", alignItems: "center", gap: SP.md, borderRadius: R.md, padding: SP.md },
  gunBaslik: { fontSize: 13, fontWeight: "700", marginTop: SP.lg, marginBottom: 2 },
});
