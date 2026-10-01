import * as Sentry from "@sentry/react-native";

/**
 * Kullanıcıya gösterilen TÜM hata metinlerinin tek kaynağı. Kural: kullanıcı asla ham
 * teknik/İngilizce metin görmez ("HTTP 500", "Network request failed", Supabase'in
 * "Invalid login credentials" vb.) — her hata burada bizim yazdığımız Türkçe mesaja
 * çevrilir. Beklenmeyen hatalar ayrıntısıyla Sentry'ye gider, biz oradan inceleriz.
 */

export const GENEL_HATA = "Bir şeyler ters gitti. Lütfen biraz sonra tekrar dene.";
export const SUNUCU_HATASI =
  "Şu an isteğini tamamlayamadık. Sorunu inceliyoruz, lütfen biraz sonra tekrar dene.";
export const BAGLANTI_HATASI = "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.";

/** HTTP durum koduna göre Türkçe mesaj (sunucu kendi Türkçe mesajını vermediyse). */
export function durumMesaji(status: number): string {
  if (status === 0) return BAGLANTI_HATASI;
  if (status === 401) return "Oturumunun süresi doldu. Lütfen tekrar giriş yap.";
  if (status === 403) return "Bu işlem için yetkin yok.";
  if (status === 404) return "Aradığın kayıt bulunamadı. Silinmiş olabilir.";
  if (status === 409) return "Bu kayıt zaten var.";
  if (status === 413) return "Gönderdiğin dosya çok büyük.";
  if (status === 422 || status === 400) return "Girdiğin bilgileri kontrol edip tekrar dene.";
  if (status === 429) return "Çok sık işlem yaptın. Biraz bekleyip tekrar dene.";
  if (status >= 500) return SUNUCU_HATASI;
  return GENEL_HATA;
}

// Supabase Auth hata kodları → Türkçe. https://supabase.com/docs/guides/auth/debugging/error-codes
const AUTH_MESAJLARI: Record<string, string> = {
  invalid_credentials: "E-posta ya da şifre hatalı.",
  email_not_confirmed: "E-posta adresin henüz doğrulanmadı. Gelen kutundaki bağlantıya tıkla.",
  user_already_exists: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.",
  email_exists: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.",
  weak_password: "Şifren çok zayıf. En az 8 karakter, harf ve rakam kullan.",
  same_password: "Yeni şifren eskisiyle aynı olamaz.",
  email_address_invalid: "Geçerli bir e-posta adresi gir.",
  validation_failed: "Girdiğin bilgileri kontrol edip tekrar dene.",
  over_email_send_rate_limit: "Çok fazla e-posta istendi. Birkaç dakika sonra tekrar dene.",
  over_request_rate_limit: "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.",
  over_sms_send_rate_limit: "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.",
  user_not_found: "Bu e-posta ile kayıtlı bir hesap bulunamadı.",
  session_expired: "Oturumunun süresi doldu. Lütfen tekrar giriş yap.",
  session_not_found: "Oturumunun süresi doldu. Lütfen tekrar giriş yap.",
  refresh_token_not_found: "Oturumunun süresi doldu. Lütfen tekrar giriş yap.",
  flow_state_not_found: "Giriş tamamlanamadı. Lütfen tekrar dene.",
  flow_state_expired: "Giriş bağlantısının süresi doldu. Lütfen tekrar dene.",
  otp_expired: "Bağlantının süresi dolmuş. Yeni bir bağlantı iste.",
  bad_code_verifier: "Giriş tamamlanamadı. Lütfen tekrar dene.",
  provider_disabled: "Bu giriş yöntemi şu an kullanılamıyor.",
  signup_disabled: "Yeni kayıtlar şu an kapalı.",
  user_banned: "Hesabın askıya alınmış. Destek ile iletişime geç.",
};

type Baglam = Record<string, unknown>;

/**
 * Beklenmeyen bir hatayı Sentry'ye raporlar. `baglam` olay ayrıntısı olarak eklenir
 * (ekran, işlem, HTTP durumu…). Kullanıcı verisi (tutar, açıklama) EKLEME — KVKK.
 */
export function hataRaporla(hata: unknown, baglam?: Baglam): void {
  if (__DEV__) console.warn("hataRaporla:", hata, baglam);
  try {
    Sentry.captureException(hata instanceof Error ? hata : new Error(String(hata)), {
      extra: baglam,
    });
  } catch {
    /* Sentry kapalıysa sessiz */
  }
}

function authKodu(hata: unknown): string | undefined {
  if (!hata || typeof hata !== "object") return undefined;
  const h = hata as { code?: unknown; name?: unknown; __isAuthError?: unknown };
  const authHatasi = h.__isAuthError === true || (typeof h.name === "string" && h.name.startsWith("Auth"));
  return authHatasi && typeof h.code === "string" ? h.code : authHatasi ? "" : undefined;
}

/**
 * Herhangi bir hatayı kullanıcıya gösterilecek Türkçe metne çevirir. Tanınmayan hatalar
 * `varsayilan` mesajla gösterilir ve Sentry'ye raporlanır.
 */
export function hataMesaji(hata: unknown, varsayilan = GENEL_HATA, baglam?: Baglam): string {
  // api.ts ApiError'ı zaten Türkçeleştirip (5xx ise) raporlamış olarak gelir.
  if (hata && typeof hata === "object" && (hata as { kullaniciMesaji?: unknown }).kullaniciMesaji) {
    return (hata as { kullaniciMesaji: string }).kullaniciMesaji;
  }
  const kod = authKodu(hata);
  if (kod !== undefined) {
    const m = kod ? AUTH_MESAJLARI[kod] : undefined;
    if (m) return m;
    hataRaporla(hata, { ...baglam, tur: "supabase_auth", kod });
    return varsayilan;
  }
  if (hata instanceof TypeError && /network request failed|fetch/i.test(hata.message)) {
    return BAGLANTI_HATASI;
  }
  hataRaporla(hata, baglam);
  return varsayilan;
}
