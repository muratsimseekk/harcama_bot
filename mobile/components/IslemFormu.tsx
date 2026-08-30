import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { Sekmeli } from "@/components/base";
import { TarihSecici } from "@/components/TarihSecici";
import { useCategories } from "@/lib/queries";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";
import { type Kategori, TIP_ETIKET, type Tip, type Yon } from "@/lib/types";

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

export function KategoriSecici({
  kategoriler,
  tip,
  secili,
  onSec,
}: {
  kategoriler: Kategori[];
  tip: Tip;
  secili: string;
  onSec: (ad: string) => void;
}) {
  const renk = useRenkler();
  const uygun = kategoriler.filter((k) => k.tip === tip && k.is_active);
  if (uygun.length === 0) {
    return (
      <TextInput
        style={[s.girdi, { color: renk.text, backgroundColor: renk.cardAlt }]}
        value={secili}
        onChangeText={onSec}
        placeholder="kategori"
        placeholderTextColor={renk.textFaint}
      />
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
      {uygun.map((k) => {
        const aktif = k.name === secili;
        return (
          <Pressable
            key={k.id}
            onPress={() => onSec(k.name)}
            style={[
              s.katCip,
              { borderColor: k.color || renk.border, backgroundColor: aktif ? k.color || renk.aksan : "transparent" },
            ]}
          >
            {aktif && <Ionicons name="checkmark" size={13} color={renk.aksanUstu} />}
            <Text style={{ color: aktif ? renk.aksanUstu : renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
              {k.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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
  katCip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 6 },
});
