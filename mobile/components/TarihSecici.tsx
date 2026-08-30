import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { R, SP, useRenkler } from "@/lib/theme";

/** ISO "YYYY-MM-DD" ⇄ yerel Date */
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
}
function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function bugunIso(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dateToIso(d);
}

const AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export function TarihSecici({ deger, onChange }: { deger: string; onChange: (iso: string) => void }) {
  const renk = useRenkler();
  const [acik, setAcik] = useState(false);
  const secili = isoToDate(deger);

  const cipler: { etiket: string; iso: string }[] = [
    { etiket: "Bugün", iso: bugunIso(0) },
    { etiket: "Dün", iso: bugunIso(-1) },
  ];

  return (
    <View style={s.satir}>
      {cipler.map((c) => {
        const aktif = deger === c.iso;
        return (
          <Pressable
            key={c.etiket}
            onPress={() => onChange(c.iso)}
            style={[s.cip, { borderColor: aktif ? renk.aksan : renk.border, backgroundColor: aktif ? renk.aksan : renk.card }]}
          >
            <Text style={{ color: aktif ? renk.aksanUstu : renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
              {c.etiket}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => setAcik(true)}
        style={[s.cip, s.tarihCip, { borderColor: renk.border, backgroundColor: renk.card }]}
      >
        <Text style={{ color: renk.text, fontSize: 12.5, fontWeight: "600" }}>
          {secili.getDate()} {AY[secili.getMonth()]} {secili.getFullYear()}
        </Text>
      </Pressable>

      {acik && (
        <DateTimePicker
          value={secili}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          maximumDate={new Date()}
          onChange={(_e, d) => {
            setAcik(Platform.OS === "ios");
            if (d) onChange(dateToIso(d));
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  satir: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SP.sm },
  cip: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 13, paddingVertical: 7 },
  tarihCip: { flexDirection: "row", alignItems: "center", gap: 6 },
});
