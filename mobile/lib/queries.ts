import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type IslemFiltre } from "./api";
import { type Para, usePara } from "./paraBirimi";
import type { Aday, Granularity, HaneRol, Kapsam, Kategori, KategoriTip, LimitTur } from "./types";

export function useTransactions(filtre: IslemFiltre = { limit: 20 }, secenek?: { enabled?: boolean }) {
  const para = usePara();
  return useQuery({
    queryKey: ["transactions", filtre, para],
    queryFn: () => api.listTransactions(filtre, para),
    enabled: secenek?.enabled,
    placeholderData: keepPreviousData, // para birimi değişirken liste boşalmasın
  });
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api.me() });
}

/** `paraZorla`: bütçe/hedef ekranları gibi her zaman TL olması gereken yerler için. */
export function useSummary(period: Granularity, ref?: string, paraZorla?: Para) {
  const secili = usePara();
  const para = paraZorla ?? secili;
  return useQuery({
    queryKey: ["summary", period, ref ?? "now", para],
    queryFn: () => api.summary(period, ref, para),
    placeholderData: keepPreviousData,
  });
}

/** "summary" altında: işlem değişince tazelenir. */
export function useKategoriKiyas(bas?: string, bit?: string, kiyas?: { obas: string; obit: string }) {
  const para = usePara();
  return useQuery({
    queryKey: ["summary", "kategoriler", bas, bit, para, kiyas?.obas, kiyas?.obit],
    queryFn: () => api.kategoriKiyas(bas!, bit!, para, kiyas),
    enabled: !!bas && !!bit && bas <= bit,
    placeholderData: keepPreviousData,
  });
}

export function useKategoriTrend(kategoriler: string[], yon: string, aylar = 6) {
  const para = usePara();
  return useQuery({
    queryKey: ["summary", "kategori-trend", kategoriler, yon, aylar, para],
    queryFn: () => api.kategoriTrend(kategoriler, yon, aylar, para),
    enabled: kategoriler.length > 0,
    placeholderData: keepPreviousData,
  });
}

/** Güncel TCMB kuru — para birimi seçicide gösterilir. */
export function useKur() {
  return useQuery({ queryKey: ["kur"], queryFn: () => api.kur(), staleTime: 30 * 60 * 1000 });
}

/** "summary" altında: işlem değişince özetle birlikte tazelenir. */
export function useMevcut(aylar: number) {
  const para = usePara();
  return useQuery({
    queryKey: ["summary", "mevcut", aylar, para],
    queryFn: () => api.mevcut(aylar, para),
    placeholderData: keepPreviousData, // dönem değişirken kart boşalıp zıplamasın
  });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories() });
}

export function invalidateHepsi(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["summary"] });
  qc.invalidateQueries({ queryKey: ["me"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
}

export function useHane() {
  return useQuery({ queryKey: ["hane"], queryFn: () => api.hane() });
}

export function useHaneMutasyon<T>(fn: (arg: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hane"] });
      invalidateHepsi(qc); // havuzlama summary/transactions/notifications'ı etkiler
    },
  });
}

export function useHaneOlustur() {
  return useHaneMutasyon((v: { ad: string; uyeAdi: string }) => api.haneOlustur(v.ad, v.uyeAdi));
}
export function useHaneKatil() {
  return useHaneMutasyon((v: { kod: string; uyeAdi: string }) => api.haneKatil(v.kod, v.uyeAdi));
}
export function useHaneAd() {
  return useHaneMutasyon((ad: string) => api.haneAd(ad));
}
export function useHaneKod() {
  return useHaneMutasyon(() => api.haneKod());
}
export function useHaneUyeRol() {
  return useHaneMutasyon((v: { uid: string; rol: HaneRol }) => api.haneUyeRol(v.uid, v.rol));
}
export function useHaneUyeCikar() {
  return useHaneMutasyon((uid: string) => api.haneUyeCikar(uid));
}
export function useHaneSil() {
  return useHaneMutasyon(() => api.haneSil());
}

export function useBudgets() {
  return useQuery({ queryKey: ["budgets"], queryFn: () => api.listBudgets() });
}

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications() });
}

export function useSetBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { kapsam: Kapsam; kapsam_deger?: string | null; limit_amount: number; tur?: LimitTur }) =>
      api.setBudget(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useSetGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: number | { tutar: number; kategori?: string }) =>
      typeof v === "number" ? api.setGoal(v) : api.setGoal(v.tutar, v.kategori),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kategori?: string) => api.deleteGoal(kategori),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useSaveTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (adaylar: Aday[]) => api.saveTransactions(adaylar),
    onSuccess: () => invalidateHepsi(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => invalidateHepsi(qc),
  });
}

/** Silinen kaydı geri getir; liste/özet tazelenir. */
export function useGeriAl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.geriAl(id),
    onSuccess: () => invalidateHepsi(qc),
  });
}

export function useTekrarlayanlar() {
  return useQuery({ queryKey: ["tekrarlayan"], queryFn: () => api.tekrarlayanlar() });
}

export function useTekrarlayanMutasyon<T>(fn: (arg: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tekrarlayan"] }),
  });
}

export function usePatchTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alanlar }: { id: string; alanlar: Partial<Aday> }) =>
      api.patchTransaction(id, alanlar),
    onSuccess: () => invalidateHepsi(qc),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; tip: KategoriTip; color?: string; keywords?: string[] }) =>
      api.createCategory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useSeedBolum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tip: KategoriTip) => api.seedBolum(tip),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function usePatchCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Kategori> }) =>
      api.patchCategory(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
