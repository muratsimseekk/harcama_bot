import { useMemo } from "react";
import { useTransactions } from "./queries";
import type { Islem, Tip, Yon } from "./types";

export type Sablon = { aciklama: string; tutar: number; kategori: string; tip: Tip; direction: Yon; adet: number };

const EN_COK = 6;

/**
 * "Hızlı ekle" çipleri: son kayıtlarda en az 2 kez geçen (açıklama + kategori + yön) kalıpları,
 * sıklığa sonra yeniliğe göre. Tutar en son girilen tutar — kahve 90, market 250 gibi.
 */
export function sablonlariCikar(kayitlar: Islem[]): Sablon[] {
  const gruplar = new Map<string, { s: Sablon; son: string }>();
  for (const t of kayitlar) {
    const ad = t.aciklama.trim();
    if (!ad) continue;
    const anahtar = `${ad.toLocaleLowerCase("tr-TR")}|${t.kategori}|${t.direction}`;
    const g = gruplar.get(anahtar);
    if (!g) {
      gruplar.set(anahtar, {
        s: { aciklama: ad, tutar: t.tutar, kategori: t.kategori, tip: t.tip, direction: t.direction, adet: 1 },
        son: t.tarih,
      });
    } else {
      g.s.adet += 1;
      if (t.tarih > g.son) {
        g.son = t.tarih;
        g.s.tutar = t.tutar;
      }
    }
  }
  return [...gruplar.values()]
    .filter((g) => g.s.adet >= 2)
    .sort((a, b) => b.s.adet - a.s.adet || (a.son < b.son ? 1 : -1))
    .slice(0, EN_COK)
    .map((g) => g.s);
}

export function useHizliSablonlar(): Sablon[] {
  // Son 200 kayıt yeterli: alışkanlıklar yakın geçmişten
  const q = useTransactions({ limit: 200 });
  return useMemo(() => sablonlariCikar(q.data ?? []), [q.data]);
}
