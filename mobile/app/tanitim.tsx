import { useRouter } from "expo-router";
import { Karsilama } from "@/components/Karsilama";

/** Ayarlar → Uygulama Tanıtımı: karşılama ekranlarını oturum açıkken yeniden gösterir. */
export default function Tanitim() {
  const router = useRouter();
  return <Karsilama onBitir={() => router.back()} bitirYazi="Uygulamaya Dön" />;
}
