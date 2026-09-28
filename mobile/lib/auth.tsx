import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

interface AuthState {
  session: Session | null;
  yukleniyor: boolean;
}

const Ctx = createContext<AuthState>({ session: null, yukleniyor: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setYukleniyor(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ session, yukleniyor }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/** Kayıt formundaki "Ad" (`user_metadata.ad`) öncelikli; Google girişinde bunun yerine
 * `full_name`/`name` geliyor — onları da profil ismi olarak kabul et. */
export function kullaniciAdi(session: Session | null): string {
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const aday = meta.ad ?? meta.full_name ?? meta.name;
  return typeof aday === "string" && aday.trim() ? aday.trim() : "";
}
