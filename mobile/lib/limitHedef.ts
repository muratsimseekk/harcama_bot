import {
  useBudgets,
  useCategories,
  useDeleteBudget,
  useDeleteGoal,
  useSetBudget,
  useSetGoal,
  useSummary,
} from "./queries";
import type { LimitTur, Yon } from "./types";

export interface MevcutLimitHedef {
  tur: LimitTur;
  tutar: number;
  harcanan: number;
  oran: number;
}

/**
 * Bir kategorinin limiti ya da hedefi — okuma ve yazma tek yerde.
 *
 * Yatırım kategorisinin hedefi mevcut yatırım alt hedeflerine (goals) yazılır; böylece
 * Hedefler'deki "Yatırım hedeflerin" kartında da görünür. Diğer her şey budgets satırı
 * (tur: limit | hedef). Tür değişince öteki kayıt silinir — kategori başına tek kural.
 */
export function useLimitHedef(kategori: string, yon: Yon) {
  const butceler = useBudgets();
  const kategoriler = useCategories();
  const ozet = useSummary("month", undefined, "TRY"); // limitler/hedefler TL
  const setBudget = useSetBudget();
  const delBudget = useDeleteBudget();
  const setGoal = useSetGoal();
  const delGoal = useDeleteGoal();

  const yatirimMi = kategoriler.data?.find((k) => k.name === kategori)?.tip === "yatirim";
  const gelirMi = yon === "gelir";
  const butce = butceler.data?.find((b) => b.kapsam === "kategori" && b.kapsam_deger === kategori);
  const ilerleme = ozet.data?.hedefler.find((h) => h.kapsam === "kategori" && h.kapsam_deger === kategori);
  const yatirimHedef = yatirimMi ? ozet.data?.yatirim?.kategoriler?.find((k) => k.kategori === kategori) : undefined;

  let mevcut: MevcutLimitHedef | null = null;
  if (butce) {
    mevcut = {
      tur: butce.tur ?? "limit",
      tutar: butce.limit_amount,
      harcanan: ilerleme?.harcanan ?? 0,
      oran: ilerleme?.oran ?? 0,
    };
  } else if (yatirimHedef) {
    mevcut = { tur: "hedef", tutar: yatirimHedef.hedef, harcanan: yatirimHedef.birikmis, oran: yatirimHedef.oran };
  }

  async function kaydet(n: number, tur: LimitTur) {
    if (tur === "hedef" && yatirimMi) {
      await setGoal.mutateAsync({ tutar: n, kategori });
      if (butce) await delBudget.mutateAsync(butce.id);
      return;
    }
    await setBudget.mutateAsync({ kapsam: "kategori", kapsam_deger: kategori, limit_amount: n, tur });
    if (yatirimHedef) await delGoal.mutateAsync(kategori);
  }

  async function kaldir() {
    if (butce) await delBudget.mutateAsync(butce.id);
    else if (yatirimHedef) await delGoal.mutateAsync(kategori);
  }

  return {
    mevcut,
    // Gelirde üst sınır anlamsız → yalnız hedef
    turSecilebilir: !gelirMi,
    varsayilanTur: (mevcut?.tur ?? (yatirimMi || gelirMi ? "hedef" : "limit")) as LimitTur,
    yukleniyor: butceler.isLoading || kategoriler.isLoading || ozet.isLoading,
    kaydet,
    kaldir,
  };
}
