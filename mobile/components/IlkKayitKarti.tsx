import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Kart } from "@/components/base";
import { Metin as Text } from "@/components/Metin";
import { useUyari } from "@/components/Uyari";
import { olay } from "@/lib/analitik";
import { api } from "@/lib/api";
import { hataMesaji } from "@/lib/hata";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";

// Tek kayıtlık örnekler: Free planda günde 3 hak var — ilk denemede hepsini bitirmesin.
const ORNEKLER = ["kahve 90", "market 850", "maaş geldi 45000"];

/**
 * Hiç kaydı olmayan hesapta ana sayfanın en üstü: tek net eylem (sesle söyle) + mikrofon izni
 * gerektirmeyen yazılı örnekler. Bkz docs/BUYUME-ANALIZI.md §3.2 (1).
 */
export function IlkKayitKarti() {
  const renk = useRenkler();
  const router = useRouter();
  const uyari = useUyari();
  const [bekleyen, setBekleyen] = useState<string | null>(null);

  async function ornekDene(m: string) {
    if (bekleyen) return;
    setBekleyen(m);
    olay("record_input_started", { girdi: "yazi", yer: "ilk_kayit_karti" });
    try {
      const y = await api.captureText(m);
      if (y.candidates.length > 0) router.push({ pathname: "/confirm", params: { data: JSON.stringify(y), girdi: "yazi" } });
    } catch (e) {
      uyari("Denenemedi", hataMesaji(e, undefined, { ekran: "ilk-kayit-karti" }));
    } finally {
      setBekleyen(null);
    }
  }

  return (
    <Kart style={[{ backgroundColor: renk.aksanSoft, alignItems: "center", gap: SP.md }]}>
      <Text style={[T.title, { color: renk.text, textAlign: "center" }]}>İlk harcamanı söyle</Text>
      <Text style={{ color: renk.textMuted, fontSize: 14.5, lineHeight: 20, textAlign: "center" }}>
        Mikrofona dokun ve "kahve 90" de. Tutar, kategori ve tarih saniyeler içinde hazır; kaydetmeden
        önce kontrol edersin.
      </Text>
      <Pressable
        onPress={() => router.navigate({ pathname: "/(app)/ekle", params: { basla: "ses", t: String(Date.now()) } })}
        accessibilityRole="button"
        accessibilityLabel="Sesle kayıt ekle"
        style={({ pressed }) => [s.mik, { backgroundColor: renk.aksan }, golge(2), pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="mic" size={34} color={renk.aksanUstu} />
      </Pressable>
      <Text style={{ color: renk.textFaint, fontSize: 12.5 }}>ya da bir örnekle dene</Text>
      <View style={s.cipler}>
        {ORNEKLER.map((m) => (
          <Pressable
            key={m}
            onPress={() => ornekDene(m)}
            disabled={!!bekleyen}
            style={[s.cip, { backgroundColor: renk.card, borderColor: renk.border }]}
          >
            {bekleyen === m ? (
              <ActivityIndicator size="small" color={renk.aksan} />
            ) : (
              <Text style={{ color: renk.text, fontSize: 13.5, fontWeight: "600" }}>"{m}"</Text>
            )}
          </Pressable>
        ))}
      </View>
    </Kart>
  );
}

const s = StyleSheet.create({
  mik: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginVertical: SP.xs },
  cipler: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: SP.sm },
  cip: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, alignItems: "center" },
});
