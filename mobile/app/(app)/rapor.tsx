import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Metin as Text } from "@/components/Metin";
import {
  Baslik,
  Ekran,
  Kart,
  KartBaslik,
  KiyasRozet,
  Sekmeli,
  Yukleniyor,
} from "@/components/base";
import { CubukGrafik, KategoriBar } from "@/components/charts";
import { birlestirKategori, kisaGun, turkceTutar } from "@/lib/format";
import { useSummary } from "@/lib/queries";
import { R, SP, useRenkler } from "@/lib/theme";
import type { Granularity } from "@/lib/types";
import { TIP_RENK } from "@/lib/types";

const GRAN: Granularity[] = ["week", "month", "year"];
const GETIKET: Record<Granularity, string> = { week: "Hafta", month: "Ay", year: "Yıl" };
const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function kaydir(period: Granularity, r: Date, yon: number): Date {
  const d = new Date(r);
  if (period === "week") d.setDate(d.getDate() + 7 * yon);
  else if (period === "year") d.setFullYear(d.getFullYear() + yon, 0, 1);
  else d.setMonth(d.getMonth() + yon, 1);
  return d;
}

export default function Rapor() {
  const renk = useRenkler();
  const [period, setPeriod] = useState<Granularity>("month");
  const [r, setR] = useState<Date>(new Date());
  const refStr = r.toISOString().slice(0, 10);

  const ozet = useSummary(period, refStr);
  const g = ozet.data?.bu_donem;
  const o = ozet.data?.onceki;
  const gelecek = kaydir(period, r, 1) > new Date();

  const grafik = useMemo(() => {
    if (!g) return { etiketler: [] as string[], degerler: [] as number[] };
    if (period === "year") {
      const aylik = Array(12).fill(0);
      for (const gn of g.gunluk) aylik[Number(gn.tarih.slice(5, 7)) - 1] += gn.gider;
      return { etiketler: AYLAR, degerler: aylik };
    }
    return {
      etiketler: g.gunluk.map((x) => kisaGun(x.tarih)),
      degerler: g.gunluk.map((x) => x.gider),
    };
  }, [g, period]);

  const katDilimler = birlestirKategori(g?.kategori_kirilim ?? []);

  function setGran(p: Granularity) {
    setPeriod(p);
    setR(new Date());
  }

  return (
    <Ekran onRefresh={ozet.refetch} refreshing={ozet.isRefetching}>
      <Baslik>Rapor</Baslik>
      <Sekmeli secenekler={GRAN} etiket={(x) => GETIKET[x]} secili={period} onSec={setGran} />

      <Kart style={s.gezinme} seviye={1}>
        <Pressable onPress={() => setR(kaydir(period, r, -1))} hitSlop={14} style={s.okBtn}>
          <Ionicons name="chevron-back" size={20} color={renk.primary} />
        </Pressable>
        <Text style={[s.donem, { color: renk.text }]}>{ozet.data?.etiket ?? "…"}</Text>
        <Pressable
          onPress={() => !gelecek && setR(kaydir(period, r, 1))}
          hitSlop={14}
          style={s.okBtn}
          disabled={gelecek}
        >
          <Ionicons name="chevron-forward" size={20} color={gelecek ? renk.textFaint : renk.primary} />
        </Pressable>
      </Kart>

      {ozet.isLoading || !g ? (
        <Yukleniyor yukseklik={200} />
      ) : (
        <>
          <View style={s.uclu}>
            <Ozetci etiket="Gider" deger={g.toplam_gider} c={renk.text} />
            <Ozetci etiket="Gelir" deger={g.toplam_gelir} c={renk.gelir} />
            <Ozetci etiket="Net" deger={g.net} c={g.net >= 0 ? renk.gelir : renk.gider} />
          </View>
          {o && (
            <View style={{ marginTop: -SP.xs }}>
              <KiyasRozet bu={g.toplam_gider} onceki={o.toplam_gider} />
            </View>
          )}

          <Kart>
            <KartBaslik ikon="bar-chart-outline">
              {period === "year" ? "Aylara göre gider" : "Günlere göre gider"}
            </KartBaslik>
            <CubukGrafik etiketler={grafik.etiketler} degerler={grafik.degerler} />
          </Kart>

          <Kart>
            <KartBaslik ikon="albums-outline">Tür kırılımı</KartBaslik>
            {g.tip_kirilim.length === 0 ? (
              <Text style={{ color: renk.textMuted }}>Veri yok.</Text>
            ) : (
              g.tip_kirilim.map((t, i) => (
                <View
                  key={t.tip}
                  style={[
                    s.tipSatir,
                    i > 0 && { borderTopColor: renk.hairline, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={[s.nokta, { backgroundColor: TIP_RENK[t.tip] }]} />
                  <Text style={{ color: renk.text, flex: 1, fontWeight: "500" }}>{t.etiket}</Text>
                  <Text style={{ color: renk.textFaint, fontSize: 13, width: 44 }}>
                    %{Math.round(t.oran)}
                  </Text>
                  <Text style={{ color: renk.text, fontWeight: "700", width: 110, textAlign: "right" }}>
                    {turkceTutar(t.tutar)} ₺
                  </Text>
                </View>
              ))
            )}
          </Kart>

          {katDilimler.length > 0 && (
            <Kart>
              <KartBaslik ikon="pricetags-outline">Kategoriler</KartBaslik>
              <KategoriBar dilimler={katDilimler} />
            </Kart>
          )}
        </>
      )}
    </Ekran>
  );
}

function Ozetci({ etiket, deger, c }: { etiket: string; deger: number; c: string }) {
  const renk = useRenkler();
  return (
    <Kart style={s.ozetKart} seviye={1}>
      <Text style={{ color: renk.textMuted, fontSize: 12 }}>{etiket}</Text>
      <Text style={{ color: c, fontSize: 15.5, fontWeight: "800" }} numberOfLines={1}>
        {turkceTutar(deger)} ₺
      </Text>
    </Kart>
  );
}

const s = StyleSheet.create({
  gezinme: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SP.sm,
    paddingHorizontal: SP.md,
  },
  okBtn: { padding: 6, borderRadius: R.sm },
  donem: { fontSize: 16, fontWeight: "800" },
  uclu: { flexDirection: "row", gap: SP.sm },
  ozetKart: { flex: 1, gap: 3, padding: SP.md },
  tipSatir: { flexDirection: "row", alignItems: "center", gap: SP.sm, paddingVertical: SP.sm + 2 },
  nokta: { width: 10, height: 10, borderRadius: 5 },
});
