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
