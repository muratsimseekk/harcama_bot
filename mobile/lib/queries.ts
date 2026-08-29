import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type IslemFiltre } from "./api";
import type { Aday, Granularity, Kapsam, Kategori, Tip } from "./types";

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

export function useBudgets() {
  return useQuery({ queryKey: ["budgets"], queryFn: () => api.listBudgets() });
}

export function useGoal() {
  return useQuery({ queryKey: ["goal"], queryFn: () => api.getGoal() });
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
    mutationFn: (body: { name: string; tip: Tip; color?: string }) =>
      api.createCategory(body),
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
