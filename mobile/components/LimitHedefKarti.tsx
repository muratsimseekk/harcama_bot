import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Kart } from "@/components/base";
import { Metin as Text } from "@/components/Metin";
import { TutarDialog } from "@/components/TutarDialog";
import { useUyari } from "@/components/Uyari";
import { turkceTutar } from "@/lib/format";
import { hataMesaji } from "@/lib/hata";
import { useLimitHedef } from "@/lib/limitHedef";
import { R, SP, useRenkler } from "@/lib/theme";
import type { LimitTur, Yon } from "@/lib/types";

/**
 * Bir kategorinin aylık limiti (üst sınır) ya da hedefi (ulaşılacak tutar) — hangisi
 * olacağına kullanıcı karar verir. Gelir kategorisinde yalnız hedef.
 */
export function LimitHedefKarti({
  kategori,
  yon,
  ortalama3,
  ekran,
}: {
  kategori: string;
  yon: Yon;
  ortalama3: number;
  ekran: string;
}) {
  const renk = useRenkler();
  const uyari = useUyari();
  const lh = useLimitHedef(kategori, yon);
  const [acik, setAcik] = useState(false);
  const [tur, setTur] = useState<LimitTur>("limit");
  const [siliniyor, setSiliniyor] = useState(false);
  const m = lh.mevcut;

  if (lh.yukleniyor) return null;

  const ac = () => {
    setTur(lh.varsayilanTur);
    setAcik(true);
  };
  const hedefMi = m?.tur === "hedef";
  const ulasti = hedefMi && m.oran >= 100;
  const barRenk = hedefMi
    ? renk.success
    : (m?.oran ?? 0) >= 100
      ? renk.danger
      : (m?.oran ?? 0) >= 80
        ? renk.warn
        : renk.aksan;
  const kalan = m ? m.tutar - m.harcanan : 0;

  return (
    <>
      <Kart>
        {m ? (
          <View style={{ gap: SP.sm }}>
            <View style={s.ust}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
                  {hedefMi ? "🎯 Aylık hedef" : "Aylık limit"}
                </Text>
                <Text style={{ color: renk.text, fontSize: 16, fontWeight: "800", marginTop: 1 }}>
                  {turkceTutar(m.harcanan)} / {turkceTutar(m.tutar)} ₺
                </Text>
              </View>
              <Pressable onPress={ac} hitSlop={8} style={[s.miniBtn, { backgroundColor: renk.cardAlt }]}>
                <Text style={{ color: renk.text, fontSize: 12.5, fontWeight: "700" }}>Değiştir</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                disabled={siliniyor}
                onPress={() =>
                  uyari(`${kategori} ${hedefMi ? "hedefi" : "limiti"}`, `Aylık ${hedefMi ? "hedef" : "limit"} kaldırılsın mı?`, [
                    { yazi: "Vazgeç", stil: "vazgec" },
                    {
                      yazi: "Kaldır",
                      stil: "tehlike",
                      onPress: async () => {
                        setSiliniyor(true);
                        try {
                          await lh.kaldir();
                        } catch (e) {
                          uyari("Kaldırılamadı", hataMesaji(e, undefined, { ekran }));
                        } finally {
                          setSiliniyor(false);
                        }
                      },
                    },
                  ])
                }
              >
                {siliniyor ? (
                  <ActivityIndicator size="small" color={renk.textFaint} />
                ) : (
                  <Ionicons name="close-circle" size={22} color={renk.textFaint} />
                )}
              </Pressable>
            </View>
            <View style={[s.ray, { backgroundColor: renk.hairline }]}>
              <View
                style={{
                  width: `${Math.min(100, Math.max(2, m.oran))}%`,
                  height: "100%",
                  borderRadius: R.pill,
                  backgroundColor: barRenk,
                }}
              />
            </View>
            <Text style={{ color: ulasti ? renk.success : renk.textFaint, fontSize: 12, fontWeight: ulasti ? "700" : "400" }}>
              {ulasti
                ? "Bu ay hedefe ulaştın 🎉"
                : hedefMi
                  ? `Bu ay %${Math.round(m.oran)} tamamlandı · hedefe ${turkceTutar(kalan)} ₺ kaldı`
                  : kalan >= 0
                    ? `Bu ay %${Math.round(m.oran)} kullanıldı · ${turkceTutar(kalan)} ₺ kaldı`
                    : `Limit ${turkceTutar(-kalan)} ₺ aşıldı`}
            </Text>
          </View>
        ) : (
          <Pressable onPress={ac} style={s.yok}>
            <View style={[s.ikon, { backgroundColor: renk.aksanSoft }]}>
              <Ionicons name="flag-outline" size={18} color={renk.aksan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }}>
                {lh.turSecilebilir ? "Limit ya da hedef koy" : "Bu kategoriye aylık hedef koy"}
              </Text>
              <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 2 }}>
                {lh.turSecilebilir
                  ? "Limit: harcama üst sınırı · Hedef: ulaşmak istediğin tutar"
                  : "Ulaşınca haber veririz"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />
          </Pressable>
        )}
      </Kart>

      <TutarDialog
        acik={acik}
        baslik={`${kategori} — aylık ${tur === "hedef" ? "hedef" : "limit"}`}
        aciklama={ortalama3 > 0 ? `Son 3 ayın ortalaması: ${turkceTutar(ortalama3)} ₺` : undefined}
        baslangic={m?.tutar ?? (ortalama3 > 0 ? Math.round(ortalama3) : undefined)}
        tur={lh.turSecilebilir ? tur : undefined}
        onTur={setTur}
        onKapat={() => setAcik(false)}
        kaydet={(n) =>
          lh.kaydet(n, lh.turSecilebilir ? tur : "hedef").catch((e) => {
            uyari("Kaydedilemedi", hataMesaji(e, undefined, { ekran }));
          })
        }
      />
    </>
  );
}

const s = StyleSheet.create({
  ust: { flexDirection: "row", alignItems: "center", gap: SP.md },
  ray: { height: 8, borderRadius: R.pill, overflow: "hidden" },
  yok: { flexDirection: "row", alignItems: "center", gap: SP.md },
  ikon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  miniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
});
