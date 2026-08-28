import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type IslemFiltre } from "./api";
import type { Aday, Granularity, Islem, Kategori, Tip } from "./types";

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
