import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type IslemFiltre } from "./api";
import type { Aday, Granularity, HaneRol, Kapsam, Kategori, Tip } from "./types";

export function useTransactions(filtre: IslemFiltre = { limit: 20 }) {
  return useQuery({
    queryKey: ["transactions", filtre],
    queryFn: () => api.listTransactions(filtre),
  });
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api.me() });
}

export function useSummary(period: Granularity, ref?: string) {
  return useQuery({
    queryKey: ["summary", period, ref ?? "now"],
    queryFn: () => api.summary(period, ref),
  });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories() });
}

function invalidateHepsi(qc: ReturnType<typeof useQueryClient>) {
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
    mutationFn: (body: { kapsam: Kapsam; kapsam_deger?: string | null; limit_amount: number }) =>
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
    mutationFn: (tutar: number) => api.setGoal(tutar),
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
    mutationFn: (body: { name: string; tip: Tip; color?: string; keywords?: string[] }) =>
      api.createCategory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useSeedBolum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tip: Tip) => api.seedBolum(tip),
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
