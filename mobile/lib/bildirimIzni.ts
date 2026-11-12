import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { olay } from "./analitik";
import { api } from "./api";
import { bildirimDurumu, type BildirimDurumu, izinVeToken, platformAdi } from "./bildirim";

/**
 * Bildirim izni artık giriş anında değil, değer görüldükten sonra istenir (ilk kayıttan sonra,
 * başlangıç listesinden ya da Ayarlar'dan). Bkz docs/BUYUME-ANALIZI.md §3.2.
 */

/** İzin zaten verildiyse token'ı sessizce kaydet; asla izin penceresi açmaz (uygulama açılışı). */
export async function tokenSessizKaydet(): Promise<void> {
  if ((await bildirimDurumu()) !== "granted") return;
  const token = await izinVeToken(false);
  if (token) await api.pushTokenKaydet(token, platformAdi).catch(() => {});
}

/** Kullanıcı "Evet" dediğinde: sistem izni + token kaydı. İzin verildi mi döner. */
export async function bildirimAc(yer: string): Promise<boolean> {
  const token = await izinVeToken(true);
  const durum = await bildirimDurumu();
  olay("push_permission_result", { izin: durum === "granted", yer });
  if (token) await api.pushTokenKaydet(token, platformAdi).catch(() => {});
  return durum === "granted";
}

/** Ekran öne gelince tazelenen izin durumu (Ayarlar'dan değiştirilip dönülmüş olabilir). */
export function useBildirimDurumu(): [BildirimDurumu | null, () => void] {
  const [durum, setDurum] = useState<BildirimDurumu | null>(null);
  const yenile = useCallback(() => {
    bildirimDurumu().then(setDurum, () => setDurum("yok"));
  }, []);
  useEffect(() => {
    yenile();
    const sub = AppState.addEventListener("change", (s) => s === "active" && yenile());
    return () => sub.remove();
  }, [yenile]);
  return [durum, yenile];
}
