import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { AyarGrup, AyarSatir } from "@/components/base";
import { Alan } from "@/components/Alan";
import { Buton } from "@/components/Buton";
import { supabase } from "@/lib/supabase";
import { SP, T, useRenkler } from "@/lib/theme";
import { Metin as Text } from "@/components/Metin";

export default function Guvenlik() {
  const renk = useRenkler();
  const [yeni, setYeni] = useState("");
  const [yeni2, setYeni2] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function degistir() {
    if (yeni.length < 6 || yeni !== yeni2) {
      Alert.alert("Kontrol et", "Şifreler eşleşmeli ve en az 6 karakter olmalı.");
      return;
    }
    setYukleniyor(true);
    const { error } = await supabase.auth.updateUser({ password: yeni });
    setYukleniyor(false);
    if (error) return Alert.alert("Hata", error.message);
    setYeni("");
    setYeni2("");
    Alert.alert("Tamam", "Şifren güncellendi.");
  }

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <Text style={[T.heading, { color: renk.text }]}>Şifre değiştir</Text>
      <Alan etiket="Yeni şifre" sifre placeholder="en az 6 karakter" value={yeni} onChangeText={setYeni} />
      <Alan etiket="Yeni şifre (tekrar)" sifre value={yeni2} onChangeText={setYeni2} />
      <Buton yazi="Güncelle" onPress={degistir} yukleniyor={yukleniyor} style={{ marginTop: SP.sm }} />

      <AyarGrup baslik="EK GÜVENLİK">
        <AyarSatir ikon="keypad-outline" baslik="PIN kodu" deger="yakında" />
        <AyarSatir ikon="finger-print-outline" baslik="Parmak izi" deger="yakında" son />
      </AyarGrup>
    </ScrollView>
  );
}

const s = StyleSheet.create({ icerik: { padding: SP.lg, gap: SP.lg } });
