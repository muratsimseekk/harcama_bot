import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Aday, Islem } from "./types";

export function useTransactions(limit = 20) {
  return useQuery({
    queryKey: ["transactions", limit],
    queryFn: () => api.listTransactions(limit),
  });
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api.me() });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function usePatchTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alanlar }: { id: string; alanlar: Partial<Aday> }) =>
      api.patchTransaction(id, alanlar),
    onSuccess: (guncel: Islem) => {
      qc.setQueriesData<Islem[]>({ queryKey: ["transactions"] }, (eski) =>
        eski?.map((t) => (t.id === guncel.id ? guncel : t)),
      );
    },
  });
}
