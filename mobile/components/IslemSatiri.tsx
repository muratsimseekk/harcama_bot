import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Metin as Text } from "@/components/Metin";
import { turkceTutar } from "@/lib/format";
import { islemTutari, SEMBOL, usePara } from "@/lib/paraBirimi";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useKategoriRenk } from "@/lib/kategoriRenk";
import { R, SP, useRenkler } from "@/lib/theme";
import type { Islem } from "@/lib/types";
import { IkonDaire } from "@/components/base";

const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function tarihEt(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${AY_KISA[m - 1]}`;
}

/**
 * İşlem satırı. `onSil` verilirse sola kaydırınca Düzenle / Sil çıkar (Sil anında yapılır,
 * altta "Geri al" gösterilir — bkz lib/islemSil.ts).
 */
export function IslemSatiri({
  islem,
  onPress,
  onSil,
}: {
  islem: Islem;
  onPress?: () => void;
  onSil?: () => void;
}) {
  const satir = <SatirIcerik islem={islem} onPress={onPress} />;
  if (!onSil) return satir;
  return <KaydirilabilirSatir onDuzenle={onPress} onSil={onSil}>{satir}</KaydirilabilirSatir>;
}

const EYLEM_GENISLIK = 76;

function KaydirilabilirSatir({
  children,
  onDuzenle,
  onSil,
}: {
  children: React.ReactNode;
  onDuzenle?: () => void;
  onSil: () => void;
}) {
  const renk = useRenkler();
  const ref = useRef<SwipeableMethods>(null);
  const eylemler = () => (
    <View style={s.eylemler}>
      {onDuzenle && (
        <Pressable
          onPress={() => {
            ref.current?.close();
            onDuzenle();
          }}
          style={[s.eylem, { backgroundColor: renk.blueSoft }]}
        >
          <Ionicons name="create-outline" size={20} color={renk.text} />
          <Text style={[s.eylemYazi, { color: renk.text }]}>Düzenle</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => {
          ref.current?.close();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onSil();
        }}
        style={[s.eylem, { backgroundColor: renk.danger }]}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={[s.eylemYazi, { color: "#fff" }]}>Sil</Text>
      </Pressable>
    </View>
  );
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      rightThreshold={EYLEM_GENISLIK / 2}
      overshootRight={false}
      renderRightActions={eylemler}
      containerStyle={{ backgroundColor: renk.bg }}
    >
      <View style={{ backgroundColor: renk.bg }}>{children}</View>
    </ReanimatedSwipeable>
  );
}

function SatirIcerik({ islem, onPress }: { islem: Islem; onPress?: () => void }) {
  const renk = useRenkler();
  const katRenk = useKategoriRenk();
  const gelir = islem.direction === "gelir";
  const para = usePara();
  const g = islemTutari(islem, para);
  const doviz = g.para !== "TRY";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.satir, pressed && onPress ? { opacity: 0.6 } : null]}
    >
      <IkonDaire ikon={kategoriIkon(islem.kategori)} renk={katRenk(islem.kategori)} boyut={48} />
      <View style={s.orta}>
        <Text style={[s.baslik, { color: renk.text }]} numberOfLines={1}>
          {islem.aciklama}
        </Text>
        <Text style={[s.tarih, { color: renk.blue }]} numberOfLines={1}>
          {tarihEt(islem.tarih)}
          {islem.ekleyen ? ` · ${islem.ekleyen}` : ""}
        </Text>
      </View>
      <View style={[s.ayrac, { backgroundColor: renk.hairline }]} />
      <Text style={[s.kategori, { color: renk.text }]} numberOfLines={1}>
        {islem.kategori}
      </Text>
      <View style={[s.ayrac, { backgroundColor: renk.hairline }]} />
      <View style={s.tutarKutu}>
        <Text style={[s.tutar, { color: gelir ? renk.text : renk.blue }]} numberOfLines={1}>
          {gelir ? "" : "-"}
          {turkceTutar(g.deger)}
          {doviz ? ` ${SEMBOL[g.para]}` : ""}
        </Text>
        {doviz && (
          // O günün kuruyla çevrildiği görünsün: asıl TL tutarı altta
          <Text style={[s.tutarAlt, { color: renk.textFaint }]} numberOfLines={1}>
            {turkceTutar(islem.tutar)} ₺
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingVertical: SP.md },
  orta: { width: 108 },
  baslik: { fontSize: 15, fontWeight: "600" },
  tarih: { fontSize: 11.5, fontWeight: "600", marginTop: 2 },
  ayrac: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginVertical: 4 },
  kategori: { flex: 1, fontSize: 12.5, fontWeight: "500", textAlign: "center" },
  tutarKutu: { width: 78, alignItems: "flex-end" },
  tutar: { textAlign: "right", fontSize: 14, fontWeight: "700" },
  tutarAlt: { textAlign: "right", fontSize: 10.5, fontWeight: "600", marginTop: 1 },
  _r: { borderRadius: R.sm },
  eylemler: { flexDirection: "row", alignItems: "stretch", paddingVertical: 6, gap: 6, paddingLeft: 6 },
  eylem: {
    width: EYLEM_GENISLIK,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  eylemYazi: { fontSize: 12, fontWeight: "700" },
});
