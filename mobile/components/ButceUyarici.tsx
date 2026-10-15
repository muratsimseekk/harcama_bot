import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useUyari } from "@/components/Uyari";
import { useAuth } from "@/lib/auth";
import { turkceTutar } from "@/lib/format";
import { useSummary } from "@/lib/queries";
import type { HedefIlerleme } from "@/lib/types";

/**
 * Bütçe uyarısı — uygulama içi pencere (push değil).
 *
 * Aylık özeti izler; bir bütçe %80'e ("yaklasti") ya da %100'e ("asti") ulaşınca bir kez
 * uyarı gösterir. Kayıt eklenince/düzenlenince özet yenilendiği için uyarı kayıt anında,
 * uygulama açılınca ya da öne gelince de o anki durumla çıkar. Aynı bütçe + aynı eşik + aynı
 * ay için ikinci kez gösterilmez (görülenler cihazda, kullanıcı başına tutulur).
 * Görünmez bileşen — `(app)` sekme düzeninde bir kez bağlanır.
 */
export function ButceUyarici() {
  const { session } = useAuth();
  const uid = session?.user?.id;
  const ozet = useSummary("month");
  const uyari = useUyari();
  const calisiyor = useRef(false);

  // Uygulama arka plandan öne gelince güncel durumu çek
  useEffect(() => {
    const sub = AppState.addEventListener("change", (d) => {
      if (d === "active") ozet.refetch();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const veri = ozet.data;
    if (!uid || !veri || calisiyor.current) return;
    const donem = veri.baslangic.slice(0, 7); // "2026-10"
    const aktif = veri.hedefler.filter((h) => h.durum !== "iyi");
    if (!aktif.length) return;

    calisiyor.current = true;
    (async () => {
      const depoAnahtari = `butce_uyari:${uid}`;
      let gorulen: string[] = [];
      try {
        gorulen = JSON.parse((await AsyncStorage.getItem(depoAnahtari)) ?? "[]");
      } catch {}
      gorulen = gorulen.filter((k) => k.endsWith(donem)); // eski ayları at

      const yeni = aktif.filter((h) => !gorulen.includes(anahtar(h, donem)));
      if (!yeni.length) return;

      try {
        await AsyncStorage.setItem(
          depoAnahtari,
          JSON.stringify([...gorulen, ...yeni.map((h) => anahtar(h, donem))]),
        );
      } catch {}
      // Kaydet ekranının "Kaydedildi" bildirimi kapansın, sonra göster
      setTimeout(() => {
        const [baslik, mesaj] = metin(yeni);
        uyari(baslik, mesaj, undefined, { ikon: "alert-circle-outline" });
      }, 1200);
    })().finally(() => {
      calisiyor.current = false;
    });
  }, [uid, ozet.data, ozet.dataUpdatedAt, uyari]);

  return null;
}

function anahtar(h: HedefIlerleme, donem: string): string {
  return `${h.durum}:${h.kapsam}:${h.kapsam_deger ?? "genel"}:${donem}`;
}

function satir(h: HedefIlerleme): string {
  return h.durum === "asti"
    ? `${h.etiket}: limiti aştın — ${turkceTutar(h.harcanan)} / ${turkceTutar(h.limit)} ₺ (%${Math.round(h.oran)})`
    : `${h.etiket}: limitin %${Math.round(h.oran)}'i doldu — ${turkceTutar(h.kalan)} ₺ kaldı`;
}

function metin(liste: HedefIlerleme[]): [string, string] {
  if (liste.length > 1) return ["Bütçe uyarısı", liste.map(satir).join("\n")];
  const h = liste[0];
  if (h.durum === "asti") {
    return [
      `${h.etiket} bütçeni aştın`,
      `Bu ay ${turkceTutar(h.harcanan)} ₺ harcadın, limitin ${turkceTutar(h.limit)} ₺ (%${Math.round(h.oran)}).`,
    ];
  }
  return [
    `${h.etiket} bütçenin %${Math.round(h.oran)}'i doldu`,
    `Bu ay için ${turkceTutar(h.kalan)} ₺ kaldı (limit ${turkceTutar(h.limit)} ₺).`,
  ];
}
