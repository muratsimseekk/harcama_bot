import { altBildirim } from "@/components/AltBildirim";
import { useUyari } from "@/components/Uyari";
import { hataMesaji } from "./hata";
import { useDeleteTransaction, useGeriAl } from "./queries";
import type { Islem } from "./types";

/**
 * Kaydı siler ve altta 5 sn "Geri al" gösterir. Silme sunucuda yumuşak (deleted_at),
 * geri al aynı kaydı aynen getirir — onay penceresine gerek kalmaz.
 */
export function useIslemSil() {
  const sil = useDeleteTransaction();
  const geri = useGeriAl();
  const uyari = useUyari();

  return async function islemSil(islem: Pick<Islem, "id" | "aciklama">, ekran = "liste"): Promise<boolean> {
    try {
      await sil.mutateAsync(islem.id);
    } catch (e) {
      uyari("Silinemedi", hataMesaji(e, undefined, { ekran }));
      return false;
    }
    altBildirim({
      mesaj: `"${islem.aciklama}" silindi`,
      ikon: "trash-outline",
      sure: 6000,
      eylem: {
        yazi: "Geri al",
        onPress: async () => {
          try {
            await geri.mutateAsync(islem.id);
            altBildirim({ mesaj: "Kayıt geri getirildi", ikon: "arrow-undo-outline", sure: 2500 });
          } catch (e) {
            uyari("Geri alınamadı", hataMesaji(e, undefined, { ekran }));
          }
        },
      },
    });
    return true;
  };
}
