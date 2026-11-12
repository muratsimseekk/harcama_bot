import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { turkceTutar } from "@/lib/format";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useDagilimRenkleri } from "@/lib/kategoriRenk";
import { type Para, SEMBOL } from "@/lib/paraBirimi";
import { R, SP, useRenkler } from "@/lib/theme";
import type { KategoriKiyas, Tip, Yon, YonKiyas } from "@/lib/types";

/**
 * Artış olumlu mu? Gelir ve yatırım artınca iyi (yeşil); harcama artınca kötü (kırmızı).
 * Yatırım kayıtları "gider" yönünde tutulur ama birikimdir — tipine bakılır.
 */
export function artisOlumlu(yon: Yon, tip?: Tip | string): boolean {
  return yon === "gelir" || tip === "yatirim";
}

/**
 * Önceki döneme göre % değişim rozeti. Olumlu değişim yeşil, olumsuz kırmızı
 * (bkz artisOlumlu). `null` → önceki dönemde hiç yoktu ("Yeni").
 */
export function DegisimRozeti({
  degisim,
  yon,
  tip,
  buyuk = false,
}: {
  degisim: number | null;
  yon: Yon;
  tip?: Tip | string;
  buyuk?: boolean;
}) {
  const renk = useRenkler();
  const boyut = buyuk ? 13.5 : 12;
  if (degisim == null) {
    return (
      <View style={[s.rozet, { backgroundColor: renk.blueSoft }]}>
        <Text style={{ color: renk.textMuted, fontSize: boyut, fontWeight: "700" }}>Yeni</Text>
      </View>
    );
  }
  const yuz = Math.round(Math.abs(degisim));
  if (yuz === 0) {
    return (
      <View style={[s.rozet, { backgroundColor: renk.blueSoft }]}>
        <Text style={{ color: renk.textMuted, fontSize: boyut, fontWeight: "700" }}>= %0</Text>
      </View>
    );
  }
  const artis = degisim > 0;
  const iyi = artisOlumlu(yon, tip) ? artis : !artis;
  const r = iyi ? renk.success : renk.danger;
  return (
    <View style={[s.rozet, { backgroundColor: iyi ? renk.successSoft : renk.dangerSoft }]}>
      <Ionicons name={artis ? "arrow-up" : "arrow-down"} size={boyut} color={r} />
      <Text style={{ color: r, fontSize: boyut, fontWeight: "800" }}>%{yuz}</Text>
    </View>
  );
}

/** Kategoriler listesi: tutar, paya göre çubuk, önceki döneme göre % değişim. */
export function KategoriKiyasListesi({
  veri,
  yon,
  para,
  onSec,
}: {
  veri: YonKiyas;
  yon: Yon;
  para: Para;
  onSec: (k: KategoriKiyas) => void;
}) {
  const renk = useRenkler();
  const renkler = useDagilimRenkleri()(veri.kategoriler.length);
  const enBuyuk = Math.max(1, ...veri.kategoriler.map((k) => Math.max(k.tutar, k.onceki_tutar)));

  if (veri.kategoriler.length === 0) {
    return (
      <Text style={{ color: renk.textFaint, textAlign: "center", paddingVertical: SP.lg }}>
        Bu aralıkta {yon === "gelir" ? "gelir" : "harcama"} yok.
      </Text>
    );
  }

  return (
    <View style={{ gap: SP.xs }}>
      {veri.kategoriler.map((k, i) => (
        <Pressable
          key={`${k.kategori}-${k.tip}`}
          onPress={() => onSec(k)}
          style={({ pressed }) => [s.satir, pressed && { opacity: 0.6 }]}
        >
          <View style={[s.ikon, { backgroundColor: renk.cardAlt }]}>
            <Ionicons name={kategoriIkon(k.kategori)} size={17} color={renkler[i]} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <View style={s.ust}>
              <Text style={{ color: renk.text, fontSize: 14.5, fontWeight: "700", flexShrink: 1 }} numberOfLines={1}>
                {k.kategori}
              </Text>
              <Text style={{ color: renk.text, fontSize: 14.5, fontWeight: "800" }}>
                {turkceTutar(k.tutar)} {SEMBOL[para]}
              </Text>
            </View>
            {/* üst ray: bu dönem, alt ince ray: önceki dönem → göz kararı kıyas */}
            <View style={[s.ray, { backgroundColor: renk.hairline }]}>
              <View style={{ width: `${(k.tutar / enBuyuk) * 100}%`, height: "100%", borderRadius: R.pill, backgroundColor: renkler[i] }} />
            </View>
            <View style={[s.rayInce, { backgroundColor: renk.hairline }]}>
              <View style={{ width: `${(k.onceki_tutar / enBuyuk) * 100}%`, height: "100%", borderRadius: R.pill, backgroundColor: renk.textFaint }} />
            </View>
            <View style={s.alt}>
              <Text style={{ color: renk.textFaint, fontSize: 12 }} numberOfLines={1}>
                {k.adet} kayıt · %{Math.round(k.oran)} pay · önceki {turkceTutar(k.onceki_tutar)} {SEMBOL[para]}
              </Text>
              <DegisimRozeti degisim={k.degisim} yon={yon} tip={k.tip} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={renk.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingVertical: SP.sm },
  ikon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ust: { flexDirection: "row", justifyContent: "space-between", gap: SP.sm },
  alt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SP.sm },
  ray: { height: 7, borderRadius: R.pill, overflow: "hidden" },
  rayInce: { height: 3, borderRadius: R.pill, overflow: "hidden", marginTop: -2 },
  rozet: { flexDirection: "row", alignItems: "center", gap: 2, borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2 },
});
