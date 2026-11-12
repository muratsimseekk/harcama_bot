import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Kart } from "@/components/base";
import { Metin as Text } from "@/components/Metin";
import { olay } from "@/lib/analitik";
import { bildirimAc, useBildirimDurumu } from "@/lib/bildirimIzni";
import { bildirimSoruldu } from "@/lib/kayitSonrasi";
import { useBudgets, useMe, useSummary, useTekrarlayanlar } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";

const GIZLI_ANAHTARI = "baslangic.gizli";

type Madde = { id: string; ad: string; alt: string; tamam: boolean; onPress?: () => void };

/**
 * Ana sayfada kapatılabilir başlangıç listesi: değere göre sıralı 4 adım + "Hesap açıldı" (ilerleme
 * %20'den başlar — başlanmış iş daha çok tamamlanır). Hepsi bitince ya da kapatılınca görünmez.
 * Hiç kaydı olmayan hesapta gösterilmez (orada IlkKayitKarti var).
 */
export function BaslangicListesi() {
  const renk = useRenkler();
  const router = useRouter();
  const me = useMe();
  const butceler = useBudgets();
  const ozet = useSummary("month", undefined, "TRY");
  const tekrarlayan = useTekrarlayanlar();
  const [bildirim, bildirimYenile] = useBildirimDurumu();
  const [gizli, setGizli] = useState<boolean | null>(null);
  const [aciliyor, setAciliyor] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GIZLI_ANAHTARI)
      .then((v) => setGizli(v === "1"))
      .catch(() => setGizli(false));
  }, []);

  const yukleniyor =
    gizli === null || !me.data || butceler.isLoading || ozet.isLoading || tekrarlayan.isLoading || bildirim === null;
  if (yukleniyor || gizli || (me.data?.toplam_kayit ?? 0) === 0) return null;

  const limitHedef =
    (butceler.data ?? []).length > 0 ||
    (ozet.data?.yatirim?.hedef ?? 0) > 0 ||
    (ozet.data?.yatirim?.kategoriler ?? []).length > 0;

  const maddeler: Madde[] = [
    { id: "hesap", ad: "Hesabını aç", alt: "", tamam: true },
    { id: "kayit", ad: "İlk harcamanı kaydet", alt: "", tamam: true },
    {
      id: "limit",
      ad: "Bir kategoriye limit ya da hedef koy",
      alt: "Market için üst sınır ya da birikim için hedef",
      tamam: limitHedef,
      onPress: () => router.navigate("/(app)/hedefler"),
    },
    {
      id: "tekrar",
      ad: "Kira, fatura gibi sabit bir gideri tekrarlat",
      alt: "Her ay aynı gün kendiliğinden eklenir",
      tamam: (tekrarlayan.data ?? []).length > 0,
      onPress: () => router.push("/tekrarlayan"),
    },
  ];
  // Bildirim modülü yoksa (Expo Go Android) bu adımı hiç gösterme
  if (bildirim !== "yok") {
    maddeler.push({
      id: "bildirim",
      ad: "Günlük özeti aç",
      alt: bildirim === "denied" ? "İzin kapalı — telefon ayarlarından açabilirsin" : "Her akşam günün özeti, bütçe uyarıları",
      tamam: bildirim === "granted",
      onPress: async () => {
        setAciliyor(true);
        await bildirimSoruldu();
        await bildirimAc("baslangic_listesi");
        bildirimYenile();
        setAciliyor(false);
      },
    });
  }

  const biten = maddeler.filter((m) => m.tamam).length;
  if (biten === maddeler.length) return null;

  const kapat = () => {
    setGizli(true);
    olay("checklist_dismissed", { biten, toplam: maddeler.length });
    AsyncStorage.setItem(GIZLI_ANAHTARI, "1").catch(() => {});
  };

  return (
    <Kart>
      <View style={s.ust}>
        <View style={{ flex: 1 }}>
          <Text style={[T.heading, { color: renk.text }]}>Başlangıç</Text>
          <Text style={{ color: renk.textFaint, fontSize: 12.5, marginTop: 2 }}>
            {biten}/{maddeler.length} tamam · Paraİzi'nden en iyi şekilde yararlan
          </Text>
        </View>
        <Pressable onPress={kapat} hitSlop={10} accessibilityLabel="Başlangıç listesini gizle">
          <Ionicons name="close" size={20} color={renk.textFaint} />
        </Pressable>
      </View>
      <View style={[s.ray, { backgroundColor: renk.hairline }]}>
        <View
          style={{
            width: `${(biten / maddeler.length) * 100}%`,
            height: "100%",
            borderRadius: R.pill,
            backgroundColor: renk.success,
          }}
        />
      </View>
      <View style={{ gap: 2, marginTop: SP.sm }}>
        {maddeler.map((m) => (
          <Pressable
            key={m.id}
            disabled={m.tamam || !m.onPress || (m.id === "bildirim" && aciliyor)}
            onPress={() => {
              olay("checklist_item_tapped", { madde: m.id });
              m.onPress?.();
            }}
            style={({ pressed }) => [s.satir, pressed && { opacity: 0.6 }]}
          >
            {m.id === "bildirim" && aciliyor ? (
              <ActivityIndicator size="small" color={renk.aksan} style={{ width: 22 }} />
            ) : (
              <Ionicons
                name={m.tamam ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={m.tamam ? renk.success : renk.textFaint}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: m.tamam ? renk.textFaint : renk.text,
                  fontSize: 14.5,
                  fontWeight: m.tamam ? "500" : "700",
                  textDecorationLine: m.tamam ? "line-through" : "none",
                }}
              >
                {m.ad}
              </Text>
              {!m.tamam && !!m.alt && (
                <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 1 }}>{m.alt}</Text>
              )}
            </View>
            {!m.tamam && m.onPress && <Ionicons name="chevron-forward" size={16} color={renk.textFaint} />}
          </Pressable>
        ))}
      </View>
    </Kart>
  );
}

const s = StyleSheet.create({
  ust: { flexDirection: "row", alignItems: "center", gap: SP.md },
  ray: { height: 6, borderRadius: R.pill, overflow: "hidden", marginTop: SP.sm },
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingVertical: 9 },
});
