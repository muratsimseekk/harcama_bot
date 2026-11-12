import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { bildirimAc } from "@/lib/bildirimIzni";
import { bildirimSoruldu, pencereAbone, pencereDurumu, pencereKapat } from "@/lib/kayitSonrasi";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";

/**
 * Kayıt sonrası pencere (bkz lib/kayitSonrasi): ilk kayıt kutlaması ve/veya bağlamlı bildirim
 * izni sorusu. Sistem izin penceresi yalnız kullanıcı "Evet" deyince açılır — reddedilen
 * sistem izni bir daha sorulamadığı için önce kendi soruyu soruyoruz.
 */
export function IlkAdimPenceresi() {
  const renk = useRenkler();
  const p = useSyncExternalStore(pencereAbone, pencereDurumu, pencereDurumu);
  const [bekliyor, setBekliyor] = useState(false);
  const olcek = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (p?.tur !== "ilk_kayit") return;
    olcek.setValue(0.6);
    Animated.spring(olcek, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
  }, [p, olcek]);

  if (!p) return null;
  const ilk = p.tur === "ilk_kayit";
  const sor = p.tur === "bildirim" || (ilk && p.bildirimSor);

  async function evet() {
    setBekliyor(true);
    await bildirimSoruldu();
    try {
      await bildirimAc(ilk ? "ilk_kayit" : "kayit_sonrasi");
    } finally {
      setBekliyor(false);
      pencereKapat();
    }
  }

  async function kapat() {
    if (sor) await bildirimSoruldu();
    pencereKapat();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={kapat}>
      <Pressable style={s.arka} onPress={kapat}>
        <Pressable style={[s.kutu, { backgroundColor: renk.card }, golge(3)]} onPress={() => {}}>
          {ilk ? (
            <>
              <Animated.Text style={[s.emoji, { transform: [{ scale: olcek }] }]}>🎉</Animated.Text>
              <Text style={[T.title, { color: renk.text, textAlign: "center" }]}>İlk kaydın tamam!</Text>
              <Text style={[s.metin, { color: renk.textMuted }]}>
                Paraİzi artık paranın izini sürüyor. Harcamalarını her seferinde böyle tek cümleyle
                söyleyebilirsin.
              </Text>
            </>
          ) : (
            <>
              <View style={[s.ikon, { backgroundColor: renk.aksanSoft }]}>
                <Ionicons name="notifications-outline" size={26} color={renk.aksan} />
              </View>
              <Text style={[T.title, { color: renk.text, textAlign: "center" }]}>Günlük özet ister misin?</Text>
            </>
          )}

          {sor ? (
            <View style={[s.soru, { backgroundColor: renk.cardAlt }]}>
              {ilk && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
                  <Ionicons name="notifications-outline" size={18} color={renk.aksan} />
                  <Text style={{ color: renk.text, fontWeight: "700", fontSize: 15 }}>Günlük özet ister misin?</Text>
                </View>
              )}
              <Text style={{ color: renk.textMuted, fontSize: 13.5, lineHeight: 19 }}>
                Her akşam o günün harcamalarını, bütçene yaklaşınca da uyarıyı bildirim olarak
                gönderelim. Unuttuğun kayıtları da hatırlatır.
              </Text>
              <Buton yazi="Evet, gönder" onPress={evet} yukleniyor={bekliyor} />
              <Pressable onPress={kapat} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 4 }}>
                <Text style={{ color: renk.textMuted, fontWeight: "600" }}>Şimdi değil</Text>
              </Pressable>
            </View>
          ) : (
            <Buton yazi="Harika" onPress={kapat} />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  arka: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: SP.xl },
  kutu: { width: "100%", borderRadius: R.lg, padding: SP.xl, gap: SP.md, alignItems: "stretch" },
  emoji: { fontSize: 56, textAlign: "center" },
  metin: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  ikon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  soru: { borderRadius: R.md, padding: SP.md, gap: SP.sm },
});
