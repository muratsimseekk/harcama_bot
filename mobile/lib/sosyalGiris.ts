import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { koduOturumaCevir, supabase } from "@/lib/supabase";
import { hataMesaji } from "@/lib/hata";

WebBrowser.maybeCompleteAuthSession();

export type SosyalSaglayici = "google" | "apple";

/** Google Cloud'daki "Web application" OAuth istemcisi — Supabase Google sağlayıcısında
 * kayıtlı olan. Native giriş idToken'ını bu istemci adına (aud) üretir. */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/** Native (telefonun kendi) Google girişi şimdilik yalnız Android'de; iOS istemcisi
 * Apple hesabı açılınca eklenecek — o zamana kadar iOS tarayıcı akışını kullanır. */
const NATIVE_GOOGLE = Platform.OS === "android" && !!GOOGLE_WEB_CLIENT_ID;

if (NATIVE_GOOGLE) {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
}

/**
 * Google: telefonun kendi hesap seçicisi → idToken → Supabase oturumu. Tarayıcı açılmaz,
 * Google ekranında Supabase adresi (mwuuicg….supabase.co) görünmez.
 */
async function googleNative(): Promise<{ hata: string | null }> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Önceki seçimi unut — her girişte hesap seçici açılsın (başka hesapla girebilmek için).
    await GoogleSignin.signOut().catch(() => {});
    const yanit = await GoogleSignin.signIn();
    if (!isSuccessResponse(yanit)) return { hata: null }; // kullanıcı iptal etti
    const idToken = yanit.data.idToken;
    if (!idToken) {
      return { hata: hataMesaji(new Error("Google idToken boş"), "Google ile giriş tamamlanamadı. Lütfen tekrar dene.") };
    }
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    return { hata: error ? hataMesaji(error, "Google ile giriş tamamlanamadı. Lütfen tekrar dene.") : null };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.IN_PROGRESS) return { hata: null };
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { hata: "Bu cihazda Google Play Hizmetleri yok ya da güncel değil. E-posta ile giriş yapabilirsin." };
      }
    }
    return {
      hata: hataMesaji(e, "Google ile giriş yapılamadı. Lütfen tekrar dene.", { tur: "google_native" }),
    };
  }
}

/**
 * Supabase'in tarayıcı tabanlı OAuth akışı — Apple ve (native kurulana kadar) iOS'ta Google.
 * İlk girişte hesap yoksa Supabase otomatik oluşturur (kayıt ve giriş ekranları aynı
 * fonksiyonu çağırır).
 */
async function tarayiciIleGiris(saglayici: SosyalSaglayici): Promise<{ hata: string | null }> {
  const redirectTo = Linking.createURL("/");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: saglayici,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { hata: hataMesaji(error ?? new Error("OAuth url yok"), "Giriş başlatılamadı. Lütfen tekrar dene.") };

  const sonuc = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (sonuc.type !== "success" || !("url" in sonuc)) return { hata: null }; // kullanıcı iptal etti

  const parcalar = Linking.parse(sonuc.url);
  const code = parcalar.queryParams?.code as string | undefined;
  if (!code) return { hata: "Giriş tamamlanamadı. Lütfen tekrar dene." };

  return koduOturumaCevir(code);
}

export async function sosyalGirisYap(saglayici: SosyalSaglayici): Promise<{ hata: string | null }> {
  if (saglayici === "google" && NATIVE_GOOGLE) return googleNative();
  return tarayiciIleGiris(saglayici);
}
