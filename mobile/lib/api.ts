import { supabase } from "./supabase";
import type { Aday, Ben, CaptureYanit, Islem } from "./types";

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

  listTransactions(limit = 20): Promise<Islem[]> {
    return jsonReq<Islem[]>(`/v1/transactions?limit=${limit}`, "GET");
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
};
