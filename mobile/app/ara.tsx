import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Cip } from "@/components/base";
import { Buton } from "@/components/Buton";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { api } from "@/lib/api";
import { tarihEtiket, turkceTutar } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";
import type { Islem, Tip, Yon } from "@/lib/types";

// Kişisel önce: kategoriler API'den tür karışık geliyor (işletme kategorileri başa düşüyordu)
const TIP_SIRA: Record<Tip, number> = { kisisel: 0, isletme: 1, yatirim: 2 };

type Aralik = "hepsi" | "buAy" | "gecenAy" | "ozel";
const ARALIK_ETIKET: Record<Aralik, string> = {
  hepsi: "Tüm zamanlar",
  buAy: "Bu ay",
  gecenAy: "Geçen ay",
  ozel: "Tarih seç",
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Seçili aralığın [başlangıç, bitiş] ISO tarihleri; "hepsi" → null. */
function aralikTarihleri(a: Aralik, bas: string, bit: string): [string, string] | null {
  const b = new Date();
  if (a === "buAy") return [iso(new Date(b.getFullYear(), b.getMonth(), 1)), iso(b)];
  if (a === "gecenAy") {
    return [iso(new Date(b.getFullYear(), b.getMonth() - 1, 1)), iso(new Date(b.getFullYear(), b.getMonth(), 0))];
  }
  if (a === "ozel") return bas <= bit ? [bas, bit] : [bit, bas];
  return null;
}

/** Tek tarih alanı: iOS'ta kompakt yerel seçici, Android'de dokununca açılan takvim. */
function TarihAlani({ etiket, deger, onChange }: { etiket: string; deger: string; onChange: (s: string) => void }) {
  const renk = useRenkler();
  const [acik, setAcik] = useState(false);
  return (
    <View style={s.tarihAlan}>
      <Text style={{ color: renk.textMuted, fontSize: 13, fontWeight: "600" }}>{etiket}</Text>
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={isoToDate(deger)}
          mode="date"
          display="compact"
          locale="tr-TR"
          maximumDate={new Date()}
          onChange={(_e, d) => d && onChange(iso(d))}
        />
      ) : (
        <>
          <Pressable
            onPress={() => setAcik(true)}
            style={[s.tarihBtn, { borderColor: renk.border, backgroundColor: renk.card }]}
          >
            <Ionicons name="calendar-outline" size={16} color={renk.aksan} />
            <Text style={{ color: renk.text, fontSize: 14, fontWeight: "600" }}>{tarihEtiket(deger)}</Text>
          </Pressable>
          {acik && (
            <DateTimePicker
              value={isoToDate(deger)}
              mode="date"
              maximumDate={new Date()}
              onChange={(_e, d) => {
                setAcik(false);
                if (d) onChange(iso(d));
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

export default function Ara() {
  const renk = useRenkler();
  const kategoriler = useCategories();
  const [q, setQ] = useState("");
  const [kat, setKat] = useState<string | null>(null);
  const [yon, setYon] = useState<Yon | null>(null);
  const [aralik, setAralik] = useState<Aralik>("hepsi");
  const [bas, setBas] = useState(() => {
    const b = new Date();
    return iso(new Date(b.getFullYear(), b.getMonth() - 1, 1));
  });
  const [bit, setBit] = useState(() => iso(new Date()));
  const [sonuc, setSonuc] = useState<Islem[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function ara() {
    setYukleniyor(true);
    try {
      const tarih = aralikTarihleri(aralik, bas, bit);
      const hepsi = await api.listTransactions({
        limit: tarih ? 500 : 400,
        direction: yon ?? undefined,
        ...(tarih ? { from: tarih[0], to: tarih[1] } : {}),
      });
      const s = q.trim().toLocaleLowerCase("tr");
      setSonuc(
        hepsi.filter(
          (t) =>
            (!kat || t.kategori === kat) &&
            (!s || t.aciklama.toLocaleLowerCase("tr").includes(s) || t.kategori.toLocaleLowerCase("tr").includes(s)),
        ),
      );
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.bg }]}>
      <View style={s.ustPad}>
        <View style={[s.aramaKutu, { backgroundColor: renk.card }]}>
          <Ionicons name="search" size={18} color={renk.textMuted} />
          <TextInput
            style={[s.aramaInput, { color: renk.text }]}
            placeholder="Ara…"
            placeholderTextColor={renk.textFaint}
            value={q}
            onChangeText={setQ}
            autoFocus
          />
        </View>
      </View>

      <ScrollView style={[s.mint, { backgroundColor: renk.bg }]} contentContainerStyle={s.icerik}>
        <Text style={[T.label, { color: renk.text }]}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Cip yazi="Hepsi" aktif={kat === null} onPress={() => setKat(null)} />
          {[...(kategoriler.data ?? [])].sort((a, b) => TIP_SIRA[a.tip] - TIP_SIRA[b.tip]).map((k) => (
            <Cip key={k.id} yazi={k.name} aktif={kat === k.name} onPress={() => setKat(k.name)} />
          ))}
        </ScrollView>

        <Text style={[T.label, { color: renk.text, marginTop: SP.md }]}>Tür</Text>
        <View style={{ flexDirection: "row", gap: SP.lg }}>
          {(["gelir", "gider"] as Yon[]).map((y) => (
            <Pressable key={y} onPress={() => setYon(yon === y ? null : y)} style={s.radio}>
              <Ionicons
                name={yon === y ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={renk.aksan}
              />
              <Text style={{ color: renk.text, fontSize: 15 }}>{y === "gelir" ? "Gelir" : "Harcama"}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[T.label, { color: renk.text, marginTop: SP.md }]}>Tarih</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {(Object.keys(ARALIK_ETIKET) as Aralik[]).map((a) => (
            <Cip key={a} yazi={ARALIK_ETIKET[a]} aktif={aralik === a} onPress={() => setAralik(a)} />
          ))}
        </ScrollView>
        {aralik === "ozel" && (
          <View style={s.tarihSatir}>
            <TarihAlani etiket="Başlangıç" deger={bas} onChange={setBas} />
            <TarihAlani etiket="Bitiş" deger={bit} onChange={setBit} />
          </View>
        )}

        <Buton yazi="Ara" onPress={ara} yukleniyor={yukleniyor} style={{ marginTop: SP.lg }} />

        {sonuc && (
          <View style={{ marginTop: SP.lg }}>
            <Text style={[T.label, { color: renk.textMuted, marginBottom: SP.sm }]}>
              {sonuc.length} sonuç
              {sonuc.some((t) => t.direction === "gider") &&
                ` · Harcama ₺${turkceTutar(sonuc.filter((t) => t.direction === "gider").reduce((a, t) => a + t.tutar, 0))}`}
              {sonuc.some((t) => t.direction === "gelir") &&
                ` · Gelir ₺${turkceTutar(sonuc.filter((t) => t.direction === "gelir").reduce((a, t) => a + t.tutar, 0))}`}
            </Text>
            {sonuc.map((t) => (
              <IslemSatiri key={t.id} islem={t} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ustPad: { paddingHorizontal: SP.lg, paddingTop: SP.sm, paddingBottom: SP.md },
  aramaKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    borderRadius: R.pill,
    paddingHorizontal: SP.lg,
    height: 48,
  },
  aramaInput: { flex: 1, fontSize: 15, fontFamily: FONT["500"] },
  mint: { flex: 1, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl },
  icerik: { padding: SP.lg, gap: SP.sm, paddingBottom: 60 },
  radio: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: SP.sm },
  tarihSatir: { flexDirection: "row", gap: SP.md, marginTop: SP.xs },
  tarihAlan: { flex: 1, gap: 6, alignItems: "flex-start" },
  tarihBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
