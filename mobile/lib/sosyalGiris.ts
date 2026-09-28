import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export type SosyalSaglayici = "google" | "apple";

/**
 * Supabase'in tarayıcı tabanlı OAuth akışı: native SDK/dev build gerektirmez,
 * Expo Go dahil her ortamda çalışır. İlk girişte hesap yoksa Supabase otomatik oluşturur
 * (kayıt ve giriş ekranları aynı fonksiyonu çağırır).
 */
export async function sosyalGirisYap(saglayici: SosyalSaglayici): Promise<{ hata: string | null }> {
  const redirectTo = Linking.createURL("/");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: saglayici,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { hata: error?.message ?? "Bağlantı oluşturulamadı" };

  const sonuc = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (sonuc.type !== "success" || !("url" in sonuc)) return { hata: null }; // kullanıcı iptal etti

  const parcalar = Linking.parse(sonuc.url);
  const code = parcalar.queryParams?.code as string | undefined;
  if (!code) return { hata: "Giriş tamamlanamadı" };

  const { error: degisimHata } = await supabase.auth.exchangeCodeForSession(code);
  return { hata: degisimHata?.message ?? null };
}
