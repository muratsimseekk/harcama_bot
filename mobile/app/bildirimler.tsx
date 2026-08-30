import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { BosDurum } from "@/components/base";
import { EkranBasligi } from "@/components/EkranBasligi";
import { Metin as Text } from "@/components/Metin";
import { useNotifications } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";

const IKON: Record<string, keyof typeof Ionicons.glyphMap> = {
  alert: "alert-circle",
  bulb: "bulb",
  trophy: "trophy",
  target: "flag",
  cash: "cash",
};

export default function Bildirimler() {
  const renk = useRenkler();
  const q = useNotifications();
  const list = q.data?.bildirimler ?? [];

  const gruplar = list.reduce<Record<string, typeof list>>((acc, b) => {
    (acc[b.grup] ??= []).push(b);
    return acc;
  }, {});

  return (
    <EkranBasligi baslik="Bildirimler" geri zil={false} onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? (
        <ActivityIndicator color={renk.aksan} style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <BosDurum ikon="notifications-outline" yazi="Şimdilik bildirim yok" />
      ) : (
        Object.entries(gruplar).map(([grup, bs]) => (
          <View key={grup} style={{ gap: SP.md }}>
            <Text style={[T.label, { color: renk.textMuted, marginTop: SP.sm }]}>{grup}</Text>
            {bs.map((b, i) => (
              <View key={i} style={s.satir}>
                <View
                  style={[
                    s.ikon,
                    { backgroundColor: b.tur === "uyari" ? renk.dangerSoft : renk.aksanSoft },
                  ]}
                >
                  <Ionicons
                    name={IKON[b.ikon] ?? "notifications"}
                    size={20}
                    color={b.tur === "uyari" ? renk.danger : renk.text}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.baslik, { color: renk.text }]}>{b.baslik}</Text>
                  <Text style={[s.metin, { color: renk.textMuted }]}>{b.metin}</Text>
                </View>
              </View>
            ))}
            <View style={[s.cizgi, { backgroundColor: renk.aksan }]} />
          </View>
        ))
      )}
    </EkranBasligi>
  );
}

const s = StyleSheet.create({
  satir: { flexDirection: "row", gap: SP.md },
  ikon: { width: 42, height: 42, borderRadius: R.sm, alignItems: "center", justifyContent: "center" },
  baslik: { fontSize: 15, fontWeight: "700" },
  metin: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  cizgi: { height: 1, opacity: 0.3, marginTop: SP.xs },
});
