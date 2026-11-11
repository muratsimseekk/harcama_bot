import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { turkceTutar, tutarKisa } from "@/lib/format";

/**
 * Gösterim para birimi (₺ / $ / €) — uygulama geneli tek tercih, cihazda saklanır.
 * Kayıtlar her zaman TL tutulur; sunucu her işlemi kendi gününün TCMB kuruyla çevirir
 * (`?para=USD`). Bütçe limitleri ve hedefler TL kalır.
 */
export type Para = "TRY" | "USD" | "EUR";
export const PARALAR: Para[] = ["TRY", "USD", "EUR"];
export const SEMBOL: Record<Para, string> = { TRY: "₺", USD: "$", EUR: "€" };
export const PARA_AD: Record<Para, string> = { TRY: "Türk Lirası", USD: "ABD Doları", EUR: "Euro" };

const ANAHTAR = "gosterim_para";
let secili: Para = "TRY";
const dinleyiciler = new Set<() => void>();

AsyncStorage.getItem(ANAHTAR)
  .then((v) => {
    if (v === "USD" || v === "EUR") {
      secili = v;
      dinleyiciler.forEach((f) => f());
    }
  })
  .catch(() => {});

export function paraSec(p: Para) {
  if (p === secili) return;
  secili = p;
  AsyncStorage.setItem(ANAHTAR, p).catch(() => {});
  dinleyiciler.forEach((f) => f());
}

function abone(f: () => void) {
  dinleyiciler.add(f);
  return () => dinleyiciler.delete(f);
}

/** Seçili gösterim para birimi (değişince bileşen yeniden çizilir). */
export function usePara(): Para {
  return useSyncExternalStore(abone, () => secili, () => secili);
}

/** "1.234,56 ₺" / "1.234,56 $" — sembol sonda (uygulamanın TL yazımıyla aynı). */
export function paraMetni(x: number, p: Para, kisa = false): string {
  return `${kisa ? tutarKisa(x) : turkceTutar(x)} ${SEMBOL[p]}`;
}

/** Kur gösterimi: 50.2282 → "50,23". */
export function kurMetni(x: number): string {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** İşlemin gösterilecek tutarı: dövizde kendi gününün kuruyla karşılığı (yoksa TL). */
export function islemTutari(t: { tutar: number; cevrilmis?: number | null }, p: Para): { deger: number; para: Para } {
  if (p !== "TRY" && t.cevrilmis != null) return { deger: t.cevrilmis, para: p };
  return { deger: t.tutar, para: "TRY" };
}
