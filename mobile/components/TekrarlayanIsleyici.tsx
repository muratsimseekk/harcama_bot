import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { altBildirim } from "@/components/AltBildirim";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { invalidateHepsi } from "@/lib/queries";

/** Arka plandan dönüşte en sık bu kadar arayla yeniden işle (gün dönümü yakalansın diye yeterli). */
const ARALIK_MS = 30 * 60 * 1000;

/**
 * Günü gelmiş tekrarlayan kayıtları (kira, abonelik …) ekletir: oturum açıldığında ve uygulama
 * öne geldiğinde. Cron yok — kullanıcı uygulamayı açmadıysa kayıtlar ilk açılışta topluca eklenir.
 */
export function TekrarlayanIsleyici() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const sonRef = useRef(0);

  useEffect(() => {
    if (!session) return;
    let iptal = false;

    const isle = async () => {
      if (Date.now() - sonRef.current < ARALIK_MS) return;
      sonRef.current = Date.now();
      try {
        const y = await api.tekrarlayanIsle();
        if (iptal || y.eklenen === 0) return;
        invalidateHepsi(qc);
        const adlar = y.aciklamalar.slice(0, 2).join(", ") + (y.aciklamalar.length > 2 ? "…" : "");
        altBildirim({
          mesaj: `${y.eklenen} tekrarlayan kayıt eklendi: ${adlar}`,
          ikon: "repeat-outline",
          sure: 5000,
        });
      } catch {
        sonRef.current = 0; // ağ yoksa bir dahaki öne gelişte tekrar dene
      }
    };

    isle();
    const abone = AppState.addEventListener("change", (d) => d === "active" && isle());
    return () => {
      iptal = true;
      abone.remove();
    };
  }, [session, qc]);

  return null;
}
