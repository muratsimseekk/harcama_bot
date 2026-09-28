/** Günlük kayıt hakkı (enerji) reklam akışı — EnerjiSheet üzerinden hem proaktif
 * (rozete dokunarak) hem reaktif (402 hatası) tetiklenir; confirm.tsx + islem-form.tsx
 * + ekle.tsx ortak kullanır. */
import type { QueryClient } from "@tanstack/react-query";
import type { EnerjiSheetDurum } from "@/components/EnerjiSheet";
import type { UyariGoster } from "@/components/Uyari";
import { api } from "@/lib/api";
import { reklamGoster } from "@/lib/reklam";

const BASARI_GOSTERIM_MS = 4000;

/**
 * Reklamı gösterir, izlendiyse kredi backend'e düşene kadar `/v1/me`'yi kontrol eder.
 * Kredi artık iki yoldan gelebilir: reklamın kendi EARNED_REWARD event'i (`reklam.ts`
 * bunu `/v1/ads/claim` ile anında ister — genelde reklam kapanmadan bile eklenmiş olur)
 * VE AdMob'un SSV callback'i (yedek, gecikebilir). "Başlangıç" sayısını reklamı GÖSTERMEDEN
 * ÖNCE ölçüyoruz — yoksa reklam kapandığında kredi çoktan eklenmiş olabiliyor ve
 * karşılaştırma hiç "yeni" görmüyor, gereksiz yere en uzun bekleme süresine kadar dönüyordu.
 * Kredi görülünce kısa bir yeşil onay (`basarili`) gösterilir. Kullanıcı istediği kadar
 * reklam izleyip kayıt hakkı açabilmeli — burada bilerek bir üst sınır YOK, yalnızca
 * (nadiren gereken) SSV gecikmesi için en fazla ~20 sn bekleniyor.
 */
async function reklamIzleVeBekle(
  uyari: UyariGoster,
  beklet: (durum: EnerjiSheetDurum) => void,
): Promise<boolean> {
  beklet({ tip: "yukleniyor", yazi: "Reklam hazırlanıyor" });
  try {
    const once = await api.me().catch(() => null);
    const baslangicKredi = once?.gun_reklam_kredisi ?? 0;

    const sonuc = await reklamGoster();
    if (sonuc !== "izlendi") {
      if (sonuc === "hata") uyari("Reklam yüklenemedi", "Birazdan tekrar dene.");
      return false;
    }
    beklet({ tip: "yukleniyor", yazi: "Kaydın işleniyor" });
    for (let deneme = 0; deneme < 8; deneme++) {
      const guncel = await api.me().catch(() => null);
      if (guncel && guncel.gun_reklam_kredisi > baslangicKredi) {
        beklet({ tip: "basarili", yazi: `+${guncel.reklam_kredi_adet} kayıt hakkı kazandın!` });
        await new Promise((r) => setTimeout(r, BASARI_GOSTERIM_MS));
        return true;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    return false;
  } finally {
    beklet(null);
  }
}

/** Reaktif akış (402'den sonra): reklamı izlet, sonra bekleyen kaydı tekrar dene. */
export async function reklamIzleVeTekrarDene(
  qc: QueryClient,
  kaydetFn: () => void | Promise<void>,
  uyari: UyariGoster,
  beklet: (durum: EnerjiSheetDurum) => void,
): Promise<void> {
  await reklamIzleVeBekle(uyari, beklet);
  await qc.invalidateQueries({ queryKey: ["me"] });
  await kaydetFn();
}

/** Proaktif akış (rozete dokunarak): reklamı izlet, hak sayısını tazele — bekleyen bir kayıt yok. */
export async function reklamIzleProaktif(
  qc: QueryClient,
  uyari: UyariGoster,
  beklet: (durum: EnerjiSheetDurum) => void,
): Promise<void> {
  await reklamIzleVeBekle(uyari, beklet);
  await qc.invalidateQueries({ queryKey: ["me"] });
}
