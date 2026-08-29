import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { Alan } from "@/components/Alan";
import { Buton } from "@/components/Buton";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SP, useRenkler } from "@/lib/theme";

export default function ProfilDuzenle() {
  const renk = useRenkler();
  const { session } = useAuth();
  const meta = (session?.user?.user_metadata ?? {}) as { ad?: string };
  const [ad, setAd] = useState(meta.ad ?? "");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function kaydet() {
    setYukleniyor(true);
    const { error } = await supabase.auth.updateUser({ data: { ad: ad.trim() } });
    setYukleniyor(false);
    Alert.alert(error ? "Hata" : "Kaydedildi", error?.message ?? "Profil güncellendi.");
  }

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <Alan etiket="Ad" placeholder="Adın" value={ad} onChangeText={setAd} />
      <Alan
        etiket="E-posta"
        value={session?.user?.email ?? "—"}
        editable={false}
      />
      <Buton yazi="Kaydet" onPress={kaydet} yukleniyor={yukleniyor} style={{ marginTop: SP.md }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({ icerik: { padding: SP.lg, gap: SP.lg } });
