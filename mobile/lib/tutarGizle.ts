import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const ANAHTAR = "tutarlar_gizli";
const MASKE = "••••";

/**
 * Ana sayfadaki bakiye/tutarları gizleme tercihi (göz butonu). Cihazda saklanır —
 * uygulama yeniden açıldığında da gizli kalır. Okunamazsa görünür başlar.
 */
export function useTutarGizle() {
  const [gizli, setGizli] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ANAHTAR)
      .then((v) => setGizli(v === "1"))
      .catch(() => {});
  }, []);

  function degistir() {
    setGizli((g) => {
      const yeni = !g;
      AsyncStorage.setItem(ANAHTAR, yeni ? "1" : "0").catch(() => {});
      return yeni;
    });
  }

  /** Gizliyken "••••", değilse verilen metin. */
  const goster = (metin: string) => (gizli ? MASKE : metin);

  return { gizli, degistir, goster };
}
