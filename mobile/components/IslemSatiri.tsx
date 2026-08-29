import { Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { turkceTutar } from "@/lib/format";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { R, SP, useRenkler } from "@/lib/theme";
import type { Islem } from "@/lib/types";
import { IkonDaire } from "@/components/base";

const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function tarihEt(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${AY_KISA[m - 1]}`;
}

export function IslemSatiri({ islem, onPress }: { islem: Islem; onPress?: () => void }) {
  const renk = useRenkler();
  const gelir = islem.direction === "gelir";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.satir, pressed && onPress ? { opacity: 0.6 } : null]}
    >
      <IkonDaire ikon={kategoriIkon(islem.kategori)} renk={renk.blueSoft} boyut={48} />
      <View style={s.orta}>
        <Text style={[s.baslik, { color: renk.text }]} numberOfLines={1}>
          {islem.aciklama}
        </Text>
        <Text style={[s.tarih, { color: renk.blue }]}>{tarihEt(islem.tarih)}</Text>
      </View>
      <View style={[s.ayrac, { backgroundColor: renk.hairline }]} />
      <Text style={[s.kategori, { color: renk.text }]} numberOfLines={1}>
        {islem.kategori}
      </Text>
      <View style={[s.ayrac, { backgroundColor: renk.hairline }]} />
      <Text style={[s.tutar, { color: gelir ? renk.text : renk.blue }]} numberOfLines={1}>
        {gelir ? "" : "-"}
        {turkceTutar(islem.tutar)}
      </Text>
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
  tutar: { width: 78, textAlign: "right", fontSize: 14, fontWeight: "700" },
  _r: { borderRadius: R.sm },
});
