import { supabase } from "./supabase";
import type {
  Aday,
  Ben,
  Bildirim,
  Butce,
  CaptureYanit,
  Granularity,
  Hedef,
  Islem,
  Kapsam,
  Kategori,
  Ozet,
  Tip,
} from "./types";

export interface IslemFiltre {
  from?: string;
  to?: string;
  tip?: Tip;
  direction?: "gider" | "gelir";
  limit?: number;
}

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  let detay = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    detay = j.detail ?? j.detay ?? detay;
  } catch {
    /* yoksay */
  }
  throw new ApiError(res.status, detay);
}

async function jsonReq<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res);
}

export const api = {
  async captureText(text: string): Promise<CaptureYanit> {
    const form = new FormData();
    form.append("text", text);
    const res = await fetch(`${BASE}/v1/capture`, {
      method: "POST",
      headers: { ...(await authHeader()) },
      body: form,
    });
    return handle<CaptureYanit>(res);
  },

  async captureAudio(uri: string): Promise<CaptureYanit> {
    const form = new FormData();
    // React Native FormData dosya biçimi
    form.append("audio", {
      uri,
      name: "ses.m4a",
      type: "audio/m4a",
    } as unknown as Blob);
    const res = await fetch(`${BASE}/v1/capture`, {
      method: "POST",
      headers: { ...(await authHeader()) },
      body: form,
    });
    return handle<CaptureYanit>(res);
  },

  saveTransactions(candidates: Aday[]): Promise<Islem[]> {
    return jsonReq<Islem[]>("/v1/transactions", "POST", { candidates });
  },

  listTransactions(f: IslemFiltre = {}): Promise<Islem[]> {
    const q = new URLSearchParams();
    if (f.limit) q.set("limit", String(f.limit));
    if (f.from) q.set("from", f.from);
    if (f.to) q.set("to", f.to);
    if (f.tip) q.set("tip", f.tip);
    if (f.direction) q.set("direction", f.direction);
    const qs = q.toString();
    return jsonReq<Islem[]>(`/v1/transactions${qs ? `?${qs}` : ""}`, "GET");
  },

  patchTransaction(id: string, alanlar: Partial<Aday>): Promise<Islem> {
    return jsonReq<Islem>(`/v1/transactions/${id}`, "PATCH", alanlar);
  },

  deleteTransaction(id: string): Promise<{ silindi: boolean }> {
    return jsonReq(`/v1/transactions/${id}`, "DELETE");
  },

  me(): Promise<Ben> {
    return jsonReq<Ben>("/v1/me", "GET");
  },

  summary(period: Granularity, ref?: string): Promise<Ozet> {
    const q = new URLSearchParams({ period });
    if (ref) q.set("ref", ref);
    return jsonReq<Ozet>(`/v1/summary?${q.toString()}`, "GET");
  },

  listCategories(): Promise<Kategori[]> {
    return jsonReq<Kategori[]>("/v1/categories", "GET");
  },

  createCategory(body: { name: string; tip: Tip; color?: string }): Promise<Kategori> {
    return jsonReq<Kategori>("/v1/categories", "POST", body);
  },

  patchCategory(id: string, body: Partial<Kategori>): Promise<Kategori> {
    return jsonReq<Kategori>(`/v1/categories/${id}`, "PATCH", body);
  },

  deleteCategory(id: string): Promise<{ silindi: boolean }> {
    return jsonReq(`/v1/categories/${id}`, "DELETE");
  },

  listBudgets(): Promise<Butce[]> {
    return jsonReq<Butce[]>("/v1/budgets", "GET");
  },

  setBudget(body: { kapsam: Kapsam; kapsam_deger?: string | null; limit_amount: number }): Promise<Butce> {
    return jsonReq<Butce>("/v1/budgets", "PUT", body);
  },

  deleteBudget(id: string): Promise<{ silindi: boolean }> {
    return jsonReq(`/v1/budgets/${id}`, "DELETE");
  },

  setGoal(hedef_amount: number): Promise<Hedef> {
    return jsonReq<Hedef>("/v1/goals", "PUT", { hedef_amount });
  },

  notifications(): Promise<{ bildirimler: Bildirim[] }> {
    return jsonReq<{ bildirimler: Bildirim[] }>("/v1/notifications", "GET");
  },

  pushTokenKaydet(token: string, platform: string): Promise<{ ok: boolean }> {
    return jsonReq("/v1/push/token", "PUT", { token, platform });
  },

  pushTokenSil(token: string): Promise<{ ok: boolean }> {
    return jsonReq("/v1/push/token", "DELETE", { token });
  },
};
