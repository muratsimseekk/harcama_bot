/** Günlük kayıt hakkı dolduğunda (402) gösterilecek uyarı butonları — confirm.tsx + islem-form.tsx ortak. */
import type { useRouter } from "expo-router";
import type { UyariButon } from "@/components/Uyari";
import { ApiError } from "@/lib/api";
import { reklamAktif } from "@/lib/reklam";
import type { EnerjiBitti402 } from "@/lib/types";

export function enerji402Mesaj(e: unknown): string | null {
  if (!(e instanceof ApiError) || e.status !== 402) return null;
  const d = e.detail as EnerjiBitti402 | undefined;
  return d?.mesaj ?? e.message;
}

export function enerji402Secenekleri(
  e: unknown,
  router: ReturnType<typeof useRouter>,
  reklamIzleVeTekrarDene: () => void,
): UyariButon[] {
  const d = e instanceof ApiError ? (e.detail as EnerjiBitti402 | undefined) : undefined;
  const secenekler: UyariButon[] = [{ yazi: "Kapat", stil: "vazgec" }];
  if (d?.reklam_izlenebilir && reklamAktif()) {
    secenekler.push({
      yazi: `Reklam İzle (+${d.reklam_kredi})`,
      onPress: reklamIzleVeTekrarDene,
    });
  }
  secenekler.push({ yazi: "Pro'ya Geç", onPress: () => router.push("/uyelik") });
  return secenekler;
}
