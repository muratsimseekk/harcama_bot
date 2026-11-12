import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { R, SP, useRenkler } from "@/lib/theme";

/** ISO "YYYY-MM-DD" ⇄ yerel Date (UTC kayması yok). */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
}
export function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function gunOnce(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateToIso(d);
}
function ayOnce(n: number): string {
  const d = new Date();
  return dateToIso(new Date(d.getFullYear(), d.getMonth() - n, 1));
}

const AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const AY_UZUN = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const GUN_BASLIK = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

export function kisaTarih(iso: string): string {
  const d = isoToDate(iso);
  return `${d.getDate()} ${AY[d.getMonth()]} ${d.getFullYear()}`;
}

export type Aralik = { bas: string; bit: string };

/** Varsayılan özel aralık: son 30 gün. */
export function varsayilanAralik(): Aralik {
  return { bas: gunOnce(29), bit: gunOnce(0) };
}

const HAZIR: { etiket: string; aralik: () => Aralik }[] = [
  { etiket: "Son 7 gün", aralik: () => ({ bas: gunOnce(6), bit: gunOnce(0) }) },
  { etiket: "Son 30 gün", aralik: () => ({ bas: gunOnce(29), bit: gunOnce(0) }) },
  { etiket: "Son 3 ay", aralik: () => ({ bas: ayOnce(2), bit: gunOnce(0) }) },
  { etiket: "Son 6 ay", aralik: () => ({ bas: ayOnce(5), bit: gunOnce(0) }) },
  { etiket: "Bu yıl", aralik: () => ({ bas: `${new Date().getFullYear()}-01-01`, bit: gunOnce(0) }) },
];

/**
 * Başlangıç–bitiş seçici: hazır aralık çipleri + açılır takvim.
 * Takvim saf JS (yerel DateTimePicker değil): iOS'ta yeni mimaride inline yerel seçici
 * uygulamayı çökertiyordu; ayrıca aralık seçimi tek takvimde daha doğal —
 * ilk dokunuş başlangıç, ikinci dokunuş bitiş.
 */
export function TarihAraligi({ deger, onChange }: { deger: Aralik; onChange: (a: Aralik) => void }) {
  const renk = useRenkler();
  const [acik, setAcik] = useState(false);
  // Takvimde ilk dokunuştan sonra bitiş bekleniyor mu?
  const [bitisBekleniyor, setBitisBekleniyor] = useState(false);
  const [ay, setAy] = useState(() => {
    const d = isoToDate(deger.bit);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const bugun = gunOnce(0);

  const gunSec = (iso: string) => {
    if (!bitisBekleniyor) {
      onChange({ bas: iso, bit: iso });
      setBitisBekleniyor(true);
    } else {
      onChange(iso < deger.bas ? { bas: iso, bit: deger.bas } : { bas: deger.bas, bit: iso });
      setBitisBekleniyor(false);
    }
  };

  // Pazartesi başlangıçlı ay ızgarası
  const ilkGun = (ay.getDay() + 6) % 7;
  const gunSayisi = new Date(ay.getFullYear(), ay.getMonth() + 1, 0).getDate();
  const hucreler: (string | null)[] = [
    ...Array(ilkGun).fill(null),
    ...Array.from({ length: gunSayisi }, (_, i) => dateToIso(new Date(ay.getFullYear(), ay.getMonth(), i + 1))),
  ];
  while (hucreler.length % 7) hucreler.push(null);
  const sonrakiAyVar = dateToIso(new Date(ay.getFullYear(), ay.getMonth() + 1, 1)) <= bugun;

  return (
    <View style={{ gap: SP.sm }}>
      <Pressable
        onPress={() => {
          setAcik((a) => !a);
          setBitisBekleniyor(false);
        }}
        style={[s.ozet, { borderColor: acik ? renk.aksan : renk.border, backgroundColor: renk.card }]}
      >
        <Ionicons name="calendar-outline" size={17} color={renk.aksan} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: renk.textFaint, fontSize: 11.5, fontWeight: "700" }}>TARİH ARALIĞI</Text>
          <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }}>
            {kisaTarih(deger.bas)} – {kisaTarih(deger.bit)}
          </Text>
        </View>
        <Ionicons name={acik ? "chevron-up" : "chevron-down"} size={18} color={renk.textFaint} />
      </Pressable>

      <View style={s.cipler}>
        {HAZIR.map((h) => {
          const a = h.aralik();
          const aktif = a.bas === deger.bas && a.bit === deger.bit;
          return (
            <Pressable
              key={h.etiket}
              onPress={() => {
                setBitisBekleniyor(false);
                onChange(a);
              }}
              style={[s.cip, { borderColor: aktif ? renk.aksan : renk.border, backgroundColor: aktif ? renk.aksan : renk.card }]}
            >
              <Text style={{ color: aktif ? renk.aksanUstu : renk.textMuted, fontSize: 13, fontWeight: "600" }}>
                {h.etiket}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {acik && (
        <View style={[s.takvim, { backgroundColor: renk.cardAlt }]}>
          <View style={s.ayBaslik}>
            <Pressable
              hitSlop={10}
              onPress={() => setAy(new Date(ay.getFullYear(), ay.getMonth() - 1, 1))}
              style={s.ok}
            >
              <Ionicons name="chevron-back" size={20} color={renk.text} />
            </Pressable>
            <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }}>
              {AY_UZUN[ay.getMonth()]} {ay.getFullYear()}
            </Text>
            <Pressable
              hitSlop={10}
              disabled={!sonrakiAyVar}
              onPress={() => setAy(new Date(ay.getFullYear(), ay.getMonth() + 1, 1))}
              style={[s.ok, !sonrakiAyVar && { opacity: 0.25 }]}
            >
              <Ionicons name="chevron-forward" size={20} color={renk.text} />
            </Pressable>
          </View>

          <View style={s.izgara}>
            {GUN_BASLIK.map((g) => (
              <View key={g} style={s.hucre}>
                <Text style={{ color: renk.textFaint, fontSize: 12, fontWeight: "700" }}>{g}</Text>
              </View>
            ))}
            {hucreler.map((iso, i) => {
              if (!iso) return <View key={`b${i}`} style={s.hucre} />;
              const gelecek = iso > bugun;
              const uc = iso === deger.bas || iso === deger.bit;
              const icinde = iso > deger.bas && iso < deger.bit;
              return (
                <Pressable
                  key={iso}
                  disabled={gelecek}
                  onPress={() => gunSec(iso)}
                  style={[s.hucre, icinde && { backgroundColor: renk.aksanSoft }]}
                >
                  <View style={[s.gun, uc && { backgroundColor: renk.aksan }]}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: uc ? "800" : "600",
                        color: uc ? renk.aksanUstu : gelecek ? renk.textFaint : renk.text,
                        opacity: gelecek ? 0.4 : 1,
                      }}
                    >
                      {Number(iso.slice(8, 10))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: renk.textMuted, fontSize: 12.5, textAlign: "center" }}>
            {bitisBekleniyor ? "Şimdi bitiş gününe dokun" : "Başlangıç gününe dokun"}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  ozet: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    borderWidth: 1,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cipler: { flexDirection: "row", flexWrap: "wrap", gap: SP.sm },
  cip: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  takvim: { borderRadius: R.md, padding: SP.sm, gap: SP.sm },
  ayBaslik: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SP.xs },
  ok: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  izgara: { flexDirection: "row", flexWrap: "wrap" },
  hucre: { width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center" },
  gun: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
