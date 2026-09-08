import { StyleSheet, TextInput, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { Sekmeli } from "@/components/base";
import { KategoriSecici } from "@/components/KategoriSecici";
import { TarihSecici } from "@/components/TarihSecici";
import { useCategories } from "@/lib/queries";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";
import { TIP_ETIKET, type Tip, type Yon } from "@/lib/types";

export interface IslemAlanlari {
  aciklama: string;
  tutar: number;
  kategori: string;
  tip: Tip;
  direction: Yon;
  tarih: string;
}

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];
const YONLER: Yon[] = ["gider", "gelir"];

export function IslemFormu({
  deger,
  guncelle,
}: {
  deger: IslemAlanlari;
  guncelle: (yama: Partial<IslemAlanlari>) => void;
}) {
  const renk = useRenkler();
  const kategoriler = useCategories();

  return (
    <View style={{ gap: SP.md }}>
      <View>
        <Text style={[T.label, { color: renk.text, marginBottom: 6 }]}>Başlık</Text>
        <TextInput
          style={[s.girdi, { color: renk.text, backgroundColor: renk.cardAlt }]}
          value={deger.aciklama}
          onChangeText={(v) => guncelle({ aciklama: v })}
          placeholder="ne aldın / ne için"
          placeholderTextColor={renk.textFaint}
        />
      </View>

      <View style={s.ikili}>
        <View style={{ flex: 1 }}>
          <Text style={[T.label, { color: renk.text, marginBottom: 6 }]}>Tutar</Text>
          <View style={[s.tutarKutu, { backgroundColor: renk.cardAlt }]}>
            <TextInput
              style={[s.tutar, { color: renk.text }]}
              value={deger.tutar ? String(deger.tutar) : ""}
              onChangeText={(v) => guncelle({ tutar: Number(v.replace(",", ".")) || 0 })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={renk.textFaint}
            />
            <Text style={{ color: renk.textMuted, fontSize: 15 }}>₺</Text>
          </View>
        </View>
      </View>

      <View>
        <Text style={[T.label, { color: renk.text, marginBottom: 6 }]}>Kategori</Text>
        <KategoriSecici
          kategoriler={kategoriler.data ?? []}
          tip={deger.tip}
          secili={deger.kategori}
          onSec={(ad) => guncelle({ kategori: ad })}
        />
      </View>

      <Sekmeli secenekler={TIPLER} etiket={(t) => TIP_ETIKET[t]} secili={deger.tip} onSec={(t) => guncelle({ tip: t })} kucuk />
      <Sekmeli
        secenekler={YONLER}
        etiket={(y) => (y === "gelir" ? "Gelir" : "Gider")}
        secili={deger.direction}
        onSec={(y) => guncelle({ direction: y })}
        kucuk
      />

      <View>
        <Text style={[T.label, { color: renk.text, marginBottom: 6 }]}>Tarih</Text>
        <TarihSecici deger={deger.tarih} onChange={(iso) => guncelle({ tarih: iso })} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  girdi: { borderRadius: R.md, paddingHorizontal: SP.lg, paddingVertical: 12, fontSize: 15.5, fontFamily: FONT["500"] },
  ikili: { flexDirection: "row", gap: SP.md },
  tutarKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: R.md,
    paddingHorizontal: SP.lg,
    paddingVertical: 10,
  },
  tutar: { flex: 1, fontSize: 17, fontFamily: FONT["600"] },
});
