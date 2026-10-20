/** Günlük kayıt hakkı (enerji) reklam akışı — EnerjiSheet üzerinden hem proaktif
 * (rozete dokunarak) hem reaktif (402 hatası) tetiklenir; confirm.tsx + islem-form.tsx
 * + ekle.tsx ortak kullanır. */
import type { QueryClient } from "@tanstack/react-query";
import type { EnerjiSheetDurum } from "@/components/EnerjiSheet";
import type { UyariGoster } from "@/components/Uyari";
import { api } from "@/lib/api";
import { reklamGoster } from "@/lib/reklam";

const BASARI_GOSTERIM_MS = 1000;

/**
 * Reklamı gösterir ve hakkın gelmesini bekler. Hak normalde reklamın EARNED_REWARD
 * event'inde `/v1/ads/claim` ile istenir ve `reklamGoster` onu bekleyip `onaylandi`
 * döner — o zaman `/v1/me` yoklamadan hemen "kazandın" denir. Claim başarısızsa AdMob
 * SSV yedeği beklenir (`/v1/me` 1 sn aralıkla, en fazla ~8 sn). Başlangıç kredisi reklamla
 * paralel ölçülür (reklamı geciktirmesin). Bilerek üst sınır YOK — kullanıcı istediği
 * kadar reklam izleyebilir.
 */
async function reklamIzleVeBekle(
  uyari: UyariGoster,
  beklet: (durum: EnerjiSheetDurum) => void,
  sira?: { no: number; toplam: number },
): Promise<boolean> {
  // Art arda birden çok reklamda ara "kazandın" ekranı gösterilmez — tek akış gibi görünür.
  const coklu = !!sira && sira.toplam > 1;
  const etiket = coklu ? ` (${sira!.no}/${sira!.toplam})` : "";
  beklet({ tip: "yukleniyor", yazi: `Reklam hazırlanıyor${etiket}` });
  const onceP = api.me().catch(() => null);

  const { sonuc, onaylandi } = await reklamGoster();
  if (sonuc !== "izlendi") {
    beklet(null);
    if (sonuc === "hata") uyari("Reklam yüklenemedi", "Birazdan tekrar dene.");
    return false;
  }
  const once = await onceP;
  if (!onaylandi) {
    beklet({ tip: "yukleniyor", yazi: "Kayıt hakkın ekleniyor" });
    const baslangic = once?.gun_reklam_kredisi ?? 0;
    let geldi = false;
    for (let deneme = 0; deneme < 8 && !geldi; deneme++) {
      await new Promise((r) => setTimeout(r, 1000));
      const guncel = await api.me().catch(() => null);
      geldi = !!guncel && guncel.gun_reklam_kredisi > baslangic;
    }
    if (!geldi) {
      beklet(null);
      uyari("Kayıt hakkı henüz gelmedi", "Reklam ödülün birkaç dakika içinde hesabına eklenecek.");
      return false;
    }
  }
  if (coklu) return true;
  beklet({ tip: "basarili", yazi: `+${once?.reklam_kredi_adet ?? 1} kayıt hakkı kazandın!` });
  await new Promise((r) => setTimeout(r, BASARI_GOSTERIM_MS));
  // Başarı durumunu burada SIFIRLAMA: sıfırlanırsa panel, kayıt yapılana kadar eski
  // "Kayıt hakkın bitti" içeriğine dönüp kullanıcıyı yanıltıyordu. Çağıran taraf
  // paneli kapattıktan sonra sıfırlar.
  return true;
}

/**
 * Bekleyen kayıtlar için gereken reklam sayısı (402 gövdesinden). Ör. 1 hak kalmışken
 * 3 kayıt → 2 hak eksik → reklam başına 1 hakla 2 reklam.
 */
export function gerekenReklam(detay: Record<string, unknown> | undefined, kayitSayisi: number): number {
  const limit = Number(detay?.gunluk_limit ?? 0);
  const kullanilan = Number(detay?.gun_kayit ?? 0);
  const kredi = Math.max(1, Number(detay?.reklam_kredi ?? 1));
  const eksik = kullanilan + kayitSayisi - limit;
  return Math.max(1, Math.ceil(eksik / kredi));
}

/** Reaktif akış (402'den sonra): gereken sayıda reklamı art arda izlet, hepsi geldiyse
 * bekleyen kaydı tekrar dene. Reklam yarıda kapatıldıysa tekrar denenmez (yine 402 alıp
 * paneli boşuna açardı); o ana kadar kazanılan haklar hesapta kalır. */
export async function reklamIzleVeTekrarDene(
  qc: QueryClient,
  kaydetFn: () => void | Promise<void>,
  uyari: UyariGoster,
  beklet: (durum: EnerjiSheetDurum) => void,
  adet = 1,
): Promise<void> {
  try {
    for (let no = 1; no <= adet; no++) {
      const kazandi = await reklamIzleVeBekle(uyari, beklet, { no, toplam: adet });
      if (!kazandi) {
        if (no > 1) {
          uyari(
            "Kayıtların henüz eklenmedi",
            `${no - 1} reklamın hakkı hesabına eklendi. Kalan reklamı izleyince kayıtların kaydedilecek.`,
          );
        }
        return;
      }
    }
    await kaydetFn(); // kaydetFn önce paneli kapatır
  } finally {
    beklet(null);
    await qc.invalidateQueries({ queryKey: ["me"] });
  }
}

/** Proaktif akış (rozete dokunarak): reklamı izlet, hak sayısını tazele — bekleyen bir kayıt yok. */
export async function reklamIzleProaktif(
  qc: QueryClient,
  uyari: UyariGoster,
  beklet: (durum: EnerjiSheetDurum) => void,
): Promise<void> {
  try {
    await reklamIzleVeBekle(uyari, beklet);
  } finally {
    await qc.invalidateQueries({ queryKey: ["me"] });
    beklet(null);
  }
}
