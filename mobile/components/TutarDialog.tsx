import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";

/**
 * Tutar soran pencere (limit/hedef). Alert.prompt Android'de yok, iOS'ta temaya uymuyor —
 * kendi pencere. `kaydet` bitene kadar açık kalır (Kaydet'te dönen daire).
 */
export function TutarDialog({
  acik,
  baslik,
  aciklama,
  baslangic,
  onKapat,
  kaydet,
}: {
  acik: boolean;
  baslik: string;
  aciklama?: string;
  baslangic?: number;
  onKapat: () => void;
  kaydet: (n: number) => Promise<void>;
}) {
  const renk = useRenkler();
  const [deger, setDeger] = useState("");
  const [bekliyor, setBekliyor] = useState(false);

  useEffect(() => {
    if (acik) setDeger(baslangic ? String(baslangic) : "");
  }, [acik, baslangic]);

  const kapat = () => !bekliyor && onKapat();
  const sayi = Number(deger.replace(/\./g, "").replace(",", "."));

  return (
    <Modal visible={acik} transparent animationType="fade" onRequestClose={kapat}>
      <Pressable style={s.arka} onPress={kapat}>
        <Pressable style={[s.kutu, { backgroundColor: renk.card }]} onPress={() => {}}>
          <Text style={[T.heading, { color: renk.text }]}>{baslik}</Text>
          {aciklama ? <Text style={{ color: renk.textMuted, fontSize: 13, lineHeight: 18 }}>{aciklama}</Text> : null}
          <TextInput
            style={[s.girdi, { color: renk.text, backgroundColor: renk.aksanSoft }]}
            keyboardType="numeric"
            autoFocus
            value={deger}
            onChangeText={setDeger}
            placeholder="₺ tutar"
            placeholderTextColor={renk.textFaint}
          />
          <View style={{ flexDirection: "row", gap: SP.sm }}>
            <Pressable style={[s.dugme, { borderColor: renk.border }]} onPress={kapat}>
              <Text style={{ color: renk.textMuted, fontWeight: "700" }}>Vazgeç</Text>
            </Pressable>
            <Pressable
              style={[s.dugme, { backgroundColor: renk.aksan, borderColor: renk.aksan, opacity: sayi > 0 ? 1 : 0.5 }]}
              disabled={bekliyor || !(sayi > 0)}
              onPress={async () => {
                setBekliyor(true);
                try {
                  await kaydet(sayi);
                } finally {
                  setBekliyor(false);
                }
                onKapat();
              }}
            >
              {bekliyor ? (
                <ActivityIndicator size="small" color={renk.aksanUstu} />
              ) : (
                <Text style={{ color: renk.aksanUstu, fontWeight: "700" }}>Kaydet</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  arka: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: SP.xl },
  kutu: { width: "100%", borderRadius: R.lg, padding: SP.lg, gap: SP.md },
  girdi: { borderRadius: R.sm, padding: 12, fontSize: 16, fontFamily: FONT["600"] },
  dugme: { flex: 1, borderWidth: 1, borderRadius: R.sm, paddingVertical: 12, alignItems: "center" },
});
