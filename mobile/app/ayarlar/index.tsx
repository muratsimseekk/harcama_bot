import { useRouter } from "expo-router";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { AyarGrup, AyarSatir } from "@/components/base";
import { IslemKatmani, useIslemKatmani } from "@/components/IslemKatmani";
import { useUyari } from "@/components/Uyari";
import { analitikTercih, analitikVar, useAnalitikAcik } from "@/lib/analitik";
import { api } from "@/lib/api";
import { bildirimAc, useBildirimDurumu } from "@/lib/bildirimIzni";
import { bildirimSoruldu } from "@/lib/kayitSonrasi";
import { supabase } from "@/lib/supabase";
import { useTemaMod } from "@/lib/tema";
import { SP, useRenkler } from "@/lib/theme";
import { DEV_NOAUTH } from "@/app/_layout";
import { hataMesaji } from "@/lib/hata";
import { DESTEK_EPOSTA } from "@/lib/yasal";

const TEMA = { system: "Sistem", light: "Açık", dark: "Koyu" } as const;
const BILDIRIM = { granted: "Açık", denied: "Kapalı", undetermined: "Kapalı", yok: "Desteklenmiyor" } as const;

export default function Ayarlar() {
  const renk = useRenkler();
  const uyari = useUyari();
  const router = useRouter();
  const { mod } = useTemaMod();
  const katman = useIslemKatmani();
  const [bildirim, bildirimYenile] = useBildirimDurumu();
  const analitikAcik = useAnalitikAcik();

  async function bildirimDokun() {
    if (bildirim === "undetermined") {
      await bildirimSoruldu();
      await bildirimAc("ayarlar");
      bildirimYenile();
      return;
    }
    if (bildirim === "yok") return;
    // Verilmiş ya da reddedilmiş izni yalnız sistem ayarları değiştirebilir
    uyari(
      bildirim === "granted" ? "Bildirimler açık" : "Bildirimler kapalı",
      bildirim === "granted"
        ? "Günlük özet, bütçe uyarıları ve hatırlatmalar geliyor. Kapatmak için telefon ayarlarına git."
        : "Günlük özet ve bütçe uyarıları için telefon ayarlarından Paraİzi'ye bildirim izni ver.",
      [
        { yazi: "Vazgeç", stil: "vazgec" },
        { yazi: "Ayarları Aç", onPress: () => Linking.openSettings() },
      ],
      { ikon: "notifications-outline" },
    );
  }

  const analitikDokun = () =>
    uyari(
      "Kullanım istatistikleri",
      "Hangi ekranların kullanıldığını anonim sayılarla ölçüp uygulamayı geliştiriyoruz. Tutar, açıklama, " +
        "kategori adı ya da e-posta gönderilmez; konum toplanmaz.",
      [
        { yazi: "Vazgeç", stil: "vazgec" },
        analitikAcik
          ? { yazi: "Kapat", stil: "tehlike", onPress: () => void analitikTercih(false) }
          : { yazi: "Aç", onPress: () => void analitikTercih(true) },
      ],
      { ikon: "stats-chart-outline" },
    );

  async function hesabiSil() {
    try {
      await katman.calistir({
        bekleyen: "Hesabın siliniyor",
        basarili: "Hesabın silindi",
        is: () => api.hesapSil(),
        // Oturum kapanınca _layout otomatik giriş ekranına yönlendirir.
        sonra: () => void supabase.auth.signOut(),
      });
    } catch (e) {
      uyari("Silinemedi", hataMesaji(e, undefined, { ekran: "hesap-sil" }));
    }
  }

  // Telefonda e-posta uygulaması yoksa openURL reddeder → adresi göster
  const destegeYaz = () =>
    Linking.openURL(`mailto:${DESTEK_EPOSTA}?subject=${encodeURIComponent("Paraİzi destek")}`).catch(() =>
      uyari("Bize yaz", `Soru, öneri ve sorunların için: ${DESTEK_EPOSTA}`),
    );

  const silOnayi = () =>
    uyari(
      "Hesabı Sil",
      "Tüm işlemlerin, kategorilerin, bütçelerin ve hesabın kalıcı olarak silinir. " +
        "Bu işlem geri alınamaz.",
      [
        { yazi: "Vazgeç", stil: "vazgec" },
        {
          yazi: "Hesabı Sil",
          stil: "tehlike",
          onPress: () =>
            uyari("Emin misin?", "Son onay. Devam edilsin mi?", [
              { yazi: "Vazgeç", stil: "vazgec" },
              { yazi: "Evet, sil", stil: "tehlike", onPress: hesabiSil },
            ]),
        },
      ],
    );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
        <AyarGrup baslik="GENEL">
          <AyarSatir
            ikon="color-palette-outline"
            baslik="Görünüm"
            deger={TEMA[mod]}
            onPress={() => router.navigate("/ayarlar/gorunum")}
          />
          <AyarSatir
            ikon="notifications-outline"
            baslik="Bildirimler"
            deger={bildirim ? BILDIRIM[bildirim] : ""}
            onPress={bildirim === "yok" ? undefined : bildirimDokun}
          />
          <AyarSatir
            ikon="sparkles-outline"
            baslik="Uygulama Tanıtımı"
            son={!analitikVar()}
            onPress={() => router.navigate("/tanitim")}
          />
          {analitikVar() && (
            <AyarSatir
              ikon="stats-chart-outline"
              baslik="Kullanım istatistikleri"
              deger={analitikAcik ? "Açık" : "Kapalı"}
              son
              onPress={analitikDokun}
            />
          )}
        </AyarGrup>

        <AyarGrup baslik="DESTEK">
          <AyarSatir
            ikon="mail-outline"
            baslik="Bize Yaz"
            deger={DESTEK_EPOSTA}
            son
            onPress={destegeYaz}
          />
        </AyarGrup>

        <AyarGrup baslik="YASAL">
          <AyarSatir
            ikon="shield-checkmark-outline"
            baslik="Gizlilik Politikası"
            onPress={() => router.navigate("/yasal?belge=gizlilik")}
          />
          <AyarSatir
            ikon="document-text-outline"
            baslik="Kullanım Koşulları"
            son
            onPress={() => router.navigate("/yasal?belge=kosullar")}
          />
        </AyarGrup>

        {!DEV_NOAUTH && (
          <AyarGrup baslik="HESAP">
            <AyarSatir
              ikon="key-outline"
              baslik="Şifre Değiştir"
              onPress={() => router.navigate("/ayarlar/guvenlik")}
            />
            <AyarSatir
              ikon="log-out-outline"
              baslik="Çıkış Yap"
              onPress={() => supabase.auth.signOut()}
            />
            <AyarSatir
              ikon="trash-outline"
              baslik="Hesabı Sil"
              tehlike
              son
              onPress={katman.durum ? undefined : silOnayi}
            />
          </AyarGrup>
        )}
      </ScrollView>
      <IslemKatmani durum={katman.durum} />
    </View>
  );
}

const s = StyleSheet.create({ icerik: { padding: SP.lg, gap: SP.lg } });
