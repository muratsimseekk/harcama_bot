import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

export type TemaMod = "system" | "light" | "dark";
const ANAHTAR = "tema.mod";

interface Ctx {
  mod: TemaMod;
  setMod: (m: TemaMod) => void;
  etkin: "light" | "dark";
}

const TemaCtx = createContext<Ctx>({ mod: "system", setMod: () => {}, etkin: "light" });

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const sistem = useColorScheme();
  const [mod, setModState] = useState<TemaMod>("system");

  useEffect(() => {
    AsyncStorage.getItem(ANAHTAR).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setModState(v);
    });
  }, []);

  const setMod = (m: TemaMod) => {
    setModState(m);
    AsyncStorage.setItem(ANAHTAR, m).catch(() => {});
  };

  const etkin: "light" | "dark" =
    mod === "system" ? (sistem === "dark" ? "dark" : "light") : mod;

  return <TemaCtx.Provider value={{ mod, setMod, etkin }}>{children}</TemaCtx.Provider>;
}

export const useTemaMod = () => useContext(TemaCtx);
export const useEtkinSema = () => useContext(TemaCtx).etkin;
