export function turkceTutar(x: number): string {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function tutarKisa(x: number): string {
  return x.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export function tarihEtiket(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const aylar = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  return `${d} ${aylar[m - 1]} ${y}`;
}

export function bugunISO(): string {
  const d = new Date();
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function yuzde(x: number): string {
  return `%${Math.round(x)}`;
}

export function kisaGun(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}`;
}

/** İki değeri kıyaslar → "+%12" / "−%8" / "yeni" */
export function kiyas(bu: number, onceki: number): { yazi: string; yon: 1 | 0 | -1 } {
  if (onceki <= 0) return { yazi: bu > 0 ? "yeni" : "—", yon: 0 };
  const fark = ((bu - onceki) / onceki) * 100;
  const yon = fark > 1 ? 1 : fark < -1 ? -1 : 0;
  const isaret = fark > 0 ? "+" : fark < 0 ? "−" : "";
  return { yazi: `${isaret}%${Math.abs(Math.round(fark))}`, yon };
}
