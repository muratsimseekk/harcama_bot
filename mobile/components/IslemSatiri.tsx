import { Pressable, StyleSheet, View } from "react-native";
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

export function IslemSatiri({ islem, onPress }: { islem: Islem; onPress?: () => void }) {
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
});
