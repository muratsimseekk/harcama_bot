import { useRouter } from "expo-router";
import { useEffect } from "react";
import { onboardTamamla } from "@/app/_layout";
import { Karsilama } from "@/components/Karsilama";

/** İlk açılış karşılaması (giriş öncesi). Ayarlar → Uygulama Tanıtımı da aynı ekranı açar. */
export default function Onboard() {
  const router = useRouter();

  // Ekrana geldiği an "görüldü" — yarıda kapatılsa da bir daha gösterilmez.
  useEffect(() => {
    onboardTamamla().catch(() => {});
  }, []);

  return (
    <Karsilama
      onBitir={() =>
        onboardTamamla()
          .catch(() => {})
          .then(() => router.replace("/(auth)/giris"))
      }
    />
  );
}
