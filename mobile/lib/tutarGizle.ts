import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

const ANAHTAR = "tutarlar_gizli";
export const MASKE = "••••";

/**
 * Tutarları gizleme tercihi (ana sayfadaki göz butonu). Uygulama genelinde tek durum:
 * açıkken HER ekrandaki tutarlar maskelenir (Metin bileşeni metindeki tutarları
 * "••••" yapar, grafik eksenleri de gizlenir). Cihazda saklanır — yeniden açılışta da
 * gizli kalır. Okunamazsa görünür başlar.
 */
let gizliDurum = false;
const dinleyiciler = new Set<() => void>();

function yayinla() {
  for (const f of dinleyiciler) f();
}

AsyncStorage.getItem(ANAHTAR)
  .then((v) => {
    if ((v === "1") !== gizliDurum) {
      gizliDurum = v === "1";
      yayinla();
    }
  })
  .catch(() => {});

function abone(f: () => void) {
  dinleyiciler.add(f);
  return () => {
    dinleyiciler.delete(f);
  };
}

export function tutarlarGizliMi(): boolean {
  return gizliDurum;
}

export function gizliDegistir() {
  gizliDurum = !gizliDurum;
  AsyncStorage.setItem(ANAHTAR, gizliDurum ? "1" : "0").catch(() => {});
  yayinla();
}

/** Yalnız durumu okur (her Metin bunu kullanır — ucuz). */
export function useGizli(): boolean {
  return useSyncExternalStore(abone, tutarlarGizliMi, tutarlarGizliMi);
}

export function useTutarGizle() {
  const gizli = useGizli();
  /** Gizliyken "••••", değilse verilen metin. */
  const goster = (metin: string) => (gizli ? MASKE : metin);
  return { gizli, degistir: gizliDegistir, goster };
}

// Metindeki tutarları bulur: "1.234,56" / "-450,00" (turkceTutar), "12.500" (binlik noktalı),
// "450 ₺" / "20 B $" (sembolün önündeki sayı). Tarih ("12.11.2026"), yüzde ("%12") ve saat dokunulmaz.
const ONDALIKLI = /\d{1,3}(?:\.\d{3})*,\d{1,2}(?!\d)/g;
const BINLIK = /(^|[^\d.])(\d{1,3}(?:\.\d{3})+)(?![\d.])/g; // lookbehind yok: Hermes uyumu
const SEMBOLLU = /\d+(?:\s?(?:B|Mn))?(?=\s?[₺$€])/g;

export function tutarMaskele(s: string): string {
  return s.replace(ONDALIKLI, MASKE).replace(BINLIK, `$1${MASKE}`).replace(SEMBOLLU, MASKE);
}
