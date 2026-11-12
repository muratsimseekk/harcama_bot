import { durumMesaji, hataRaporla } from "./hata";
import type { Para } from "./paraBirimi";
import { supabase } from "./supabase";
import type {
  Aday,
  Ben,
  Bildirim,
  Butce,
  CaptureYanit,
  Granularity,
  GuncelKur,
  Hane,
  HaneRol,
  Hedef,
  Islem,
  Kapsam,
  Kategori,
  KategoriTip,
  Mevcut,
  Ozet,
  Tip,
  KategoriKiyasYanit,
  KategoriTrend,
  Tekrarlayan,
  TekrarlayanIstek,
} from "./types";

export interface IslemFiltre {
  from?: string;
  to?: string;
  tip?: Tip;
  direction?: "gider" | "gelir";
  kategoriler?: string[];
  limit?: number;
}

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

/**
 * API hatası. `message` / `kullaniciMesaji` HER ZAMAN kullanıcıya gösterilebilir Türkçe
 * metindir (bkz lib/hata.ts) — ham "HTTP 500" ya da İngilizce sunucu metni taşımaz.
 */
export class ApiError extends Error {
  status: number;
  /** 402 gibi uç noktaların döndürdüğü yapısal gövde (bkz Ai Limit402 tip). */
  detail?: Record<string, unknown>;
  kullaniciMesaji: string;
  constructor(status: number, message: string, detail?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.kullaniciMesaji = message;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** fetch'i sarar: ağ hatası (sunucuya hiç ulaşılamadı) → Türkçe ApiError(0). */
async function istek(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE}${path}`, init);
  } catch (e) {
    // Dosya yüklemesi (ses) ağ hatası çoğu zaman gerçek bağlantı sorunu değil, istemci
    // tarafı bir kırılmadır (bkz eas.json EXPO_PUBLIC_USE_RN_FETCH) — Sentry'de görelim.
    if (init.body instanceof FormData) hataRaporla(e, { tur: "api_ag", yol: path });
    throw new ApiError(0, durumMesaji(0), { yol: path });
  }
}

async function handle<T>(res: Response, yol: string, method: string): Promise<T> {
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  let sunucuMesaji: string | undefined;
  let detail: Record<string, unknown> | undefined;
  let govde = "";
  try {
    govde = await res.text();
    const j = JSON.parse(govde);
    if (j.detail && typeof j.detail === "object" && !Array.isArray(j.detail)) {
      detail = j.detail;
      if (typeof j.detail.mesaj === "string") sunucuMesaji = j.detail.mesaj;
    } else if (typeof j.detail === "string") {
      sunucuMesaji = j.detail;
    }
  } catch {
    /* JSON değil — yoksay */
  }
  // 401 (oturum) ve 5xx'te sunucu metnine güvenme — teknik/İngilizce olabilir.
  const sunucuyaGuven = res.status !== 401 && res.status !== 422 && res.status < 500;
  const mesaj = (sunucuyaGuven && sunucuMesaji) || durumMesaji(res.status);
  if (res.status >= 500) {
    hataRaporla(new Error(`API ${res.status} ${method} ${yol}`), {
      tur: "api",
      status: res.status,
      yol,
      method,
      govde: govde.slice(0, 500),
    });
  }
  throw new ApiError(res.status, mesaj, detail);
}

async function jsonReq<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await istek(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res, path, method);
}

export const api = {
  async captureText(text: string): Promise<CaptureYanit> {
    const form = new FormData();
    form.append("text", text);
    const res = await istek("/v1/capture", {
      method: "POST",
      headers: { ...(await authHeader()) },
      body: form,
    });
    return handle<CaptureYanit>(res, "/v1/capture", "POST");
  },

  async captureAudio(uri: string): Promise<CaptureYanit> {
    const form = new FormData();
    // React Native FormData dosya biçimi
    form.append("audio", {
      uri,
      name: "ses.m4a",
      type: "audio/m4a",
    } as unknown as Blob);
    const res = await istek("/v1/capture", {
      method: "POST",
      headers: { ...(await authHeader()) },
      body: form,
    });
    return handle<CaptureYanit>(res, "/v1/capture", "POST");
  },

  saveTransactions(candidates: Aday[]): Promise<Islem[]> {
    return jsonReq<Islem[]>("/v1/transactions", "POST", { candidates });
  },

  listTransactions(f: IslemFiltre = {}, para: Para = "TRY"): Promise<Islem[]> {
    const q = new URLSearchParams();
    if (para !== "TRY") q.set("para", para);
    if (f.limit) q.set("limit", String(f.limit));
    if (f.from) q.set("from", f.from);
    if (f.to) q.set("to", f.to);
    if (f.tip) q.set("tip", f.tip);
    if (f.direction) q.set("direction", f.direction);
    for (const k of f.kategoriler ?? []) q.append("kategori", k);
    const qs = q.toString();
    return jsonReq<Islem[]>(`/v1/transactions${qs ? `?${qs}` : ""}`, "GET");
  },

  patchTransaction(id: string, alanlar: Partial<Aday>): Promise<Islem> {
    return jsonReq<Islem>(`/v1/transactions/${id}`, "PATCH", alanlar);
  },

  deleteTransaction(id: string): Promise<{ silindi: boolean }> {
    return jsonReq(`/v1/transactions/${id}`, "DELETE");
  },

  /** Silinen kaydı geri getirir ("Kayıt silindi · Geri al"). */
  geriAl(id: string): Promise<Islem> {
    return jsonReq<Islem>(`/v1/transactions/${id}/geri-al`, "POST");
  },

  tekrarlayanlar(): Promise<Tekrarlayan[]> {
    return jsonReq<Tekrarlayan[]>("/v1/tekrarlayan", "GET");
  },

  tekrarlayanEkle(body: TekrarlayanIstek): Promise<Tekrarlayan> {
    return jsonReq<Tekrarlayan>("/v1/tekrarlayan", "POST", body);
  },

  tekrarlayanGuncelle(id: string, alanlar: Partial<TekrarlayanIstek> & { aktif?: boolean }): Promise<Tekrarlayan> {
    return jsonReq<Tekrarlayan>(`/v1/tekrarlayan/${id}`, "PATCH", alanlar);
  },

  tekrarlayanSil(id: string): Promise<{ silindi: boolean }> {
    return jsonReq(`/v1/tekrarlayan/${id}`, "DELETE");
  },

  /** Günü gelmiş tekrarlayan kayıtları ekler (uygulama açılınca / öne gelince). */
  tekrarlayanIsle(): Promise<{ eklenen: number; aciklamalar: string[] }> {
    return jsonReq("/v1/tekrarlayan/isle", "POST");
  },

  /** Dışa aktarma adresi + yetki başlığı (Excel indirme `File.downloadFileAsync` ile). */
  async disaAktarIstek(bas: string, bit: string, bicim: "xlsx" | "html") {
    const q = new URLSearchParams({ bas, bit, bicim });
    return { url: `${BASE}/v1/disa-aktar?${q.toString()}`, headers: await authHeader() };
  },

  /** PDF için yazdırılabilir HTML (cihazda expo-print ile PDF'e çevrilir). */
  async disaAktarHtml(bas: string, bit: string): Promise<string> {
    const yol = `/v1/disa-aktar?${new URLSearchParams({ bas, bit, bicim: "html" }).toString()}`;
    const res = await istek(yol, { method: "GET", headers: await authHeader() });
    if (!res.ok) await handle(res, yol, "GET"); // ApiError fırlatır (402 → Pro gerekli)
    return res.text();
  },

  me(): Promise<Ben> {
    return jsonReq<Ben>("/v1/me", "GET");
  },
  /** Mağazadaki en son build numaraları — güncelleme penceresi için (giriş gerekmez). */
  surum(): Promise<{ android: number; ios: number }> {
    return jsonReq("/v1/surum", "GET");
  },
  /** Satın alma sonrası: sunucu RevenueCat'e sorup planı hemen günceller (webhook beklemeden). */
  rcSync(): Promise<{ plan: "free" | "pro"; senkron: boolean }> {
    return jsonReq("/v1/rc/sync", "POST");
  },
  hesapSil(): Promise<{ silindi: boolean }> {
    return jsonReq("/v1/me", "DELETE");
  },

  hane(): Promise<Hane | null> {
    return jsonReq<Hane | null>("/v1/hane", "GET");
  },
  haneOlustur(ad: string, uyeAdi: string): Promise<Hane> {
    return jsonReq<Hane>("/v1/hane", "POST", { ad, uye_adi: uyeAdi });
  },
  haneKatil(kod: string, uyeAdi: string): Promise<Hane> {
    return jsonReq<Hane>("/v1/hane/katil", "POST", { kod, uye_adi: uyeAdi });
  },
  haneAd(ad: string): Promise<Hane> {
    return jsonReq<Hane>("/v1/hane", "PATCH", { ad });
  },
  haneKod(): Promise<{ kod: string }> {
    return jsonReq<{ kod: string }>("/v1/hane/kod", "POST");
  },
  haneUyeRol(uid: string, rol: HaneRol): Promise<{ ok: boolean }> {
    return jsonReq(`/v1/hane/uye/${uid}`, "PATCH", { rol });
  },
  haneUyeCikar(uid: string): Promise<{ ok: boolean }> {
    return jsonReq(`/v1/hane/uye/${uid}`, "DELETE");
  },
  haneAyril(uid: string): Promise<{ ok: boolean }> {
    return jsonReq(`/v1/hane/uye/${uid}`, "DELETE");
  },
  haneSil(): Promise<{ ok: boolean }> {
    return jsonReq("/v1/hane", "DELETE");
  },

  summary(period: Granularity, ref?: string, para: Para = "TRY"): Promise<Ozet> {
    const q = new URLSearchParams({ period });
    if (ref) q.set("ref", ref);
    if (para !== "TRY") q.set("para", para);
    return jsonReq<Ozet>(`/v1/summary?${q.toString()}`, "GET");
  },

  mevcut(aylar: number, para: Para = "TRY"): Promise<Mevcut> {
    return jsonReq<Mevcut>(`/v1/summary/mevcut?aylar=${aylar}${para !== "TRY" ? `&para=${para}` : ""}`, "GET");
  },

  /** Tarih aralığında kategori toplamları + önceki eşdeğer döneme göre % değişim. */
  kategoriKiyas(
    bas: string,
    bit: string,
    para: Para = "TRY",
    kiyas?: { obas: string; obit: string },
  ): Promise<KategoriKiyasYanit> {
    const q = new URLSearchParams({ bas, bit });
    if (para !== "TRY") q.set("para", para);
    if (kiyas) {
      q.set("obas", kiyas.obas);
      q.set("obit", kiyas.obit);
    }
    return jsonReq<KategoriKiyasYanit>(`/v1/summary/kategoriler?${q.toString()}`, "GET");
  },

  /** Kategori(ler)in son `aylar` aylık toplamı + aydan aya % değişim. */
  kategoriTrend(kategoriler: string[], yon: string, aylar = 6, para: Para = "TRY"): Promise<KategoriTrend> {
    const q = new URLSearchParams({ yon, aylar: String(aylar) });
    for (const k of kategoriler) q.append("kategori", k);
    if (para !== "TRY") q.set("para", para);
    return jsonReq<KategoriTrend>(`/v1/summary/kategori-trend?${q.toString()}`, "GET");
  },

  /** Güncel TCMB kurları (1 USD / 1 EUR kaç TL). */
  kur(): Promise<GuncelKur> {
    return jsonReq<GuncelKur>("/v1/kur", "GET");
  },

  listCategories(): Promise<Kategori[]> {
    return jsonReq<Kategori[]>("/v1/categories", "GET");
  },

  createCategory(body: {
    name: string;
    tip: KategoriTip;
    color?: string;
    keywords?: string[];
  }): Promise<Kategori> {
    return jsonReq<Kategori>("/v1/categories", "POST", body);
  },

  patchCategory(id: string, body: Partial<Kategori>): Promise<Kategori> {
    return jsonReq<Kategori>(`/v1/categories/${id}`, "PATCH", body);
  },

  seedBolum(tip: KategoriTip): Promise<{ eklendi: number }> {
    return jsonReq(`/v1/categories/bolum`, "POST", { tip });
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

  /** `kategori` verilirse o yatırım kategorisinin alt hedefi; yoksa genel yatırım hedefi. */
  setGoal(hedef_amount: number, kategori?: string): Promise<Hedef> {
    return jsonReq<Hedef>("/v1/goals", "PUT", kategori ? { hedef_amount, kategori } : { hedef_amount });
  },

  deleteGoal(kategori?: string): Promise<{ silindi: boolean }> {
    const q = kategori ? `?kategori=${encodeURIComponent(kategori)}` : "";
    return jsonReq(`/v1/goals${q}`, "DELETE");
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

  adsRequestToken(): Promise<{ token: string }> {
    return jsonReq("/v1/ads/request-token", "POST");
  },

  /** İstemci tarafı ödül talebi — reklam SDK'sının EARNED_REWARD event'i tetiklenince
   * SSV'yi beklemeden krediyi hemen ister (bkz api/routes/reklam.py modül docstring). */
  adsClaim(token: string): Promise<{ eklendi: boolean }> {
    return jsonReq("/v1/ads/claim", "POST", { token });
  },
};
