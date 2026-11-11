import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { tarihEtiket } from "@/lib/format";
import { kurMetni, PARA_AD, PARALAR, paraSec, SEMBOL, usePara } from "@/lib/paraBirimi";
import { useKur } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";

/**
 * Başlıktaki ₺ / $ / € düğmesi. Basınca para birimi penceresi açılır; seçim tüm
 * uygulamaya uygulanır. Her kayıt kendi gününün TCMB kuruyla çevrilir.
 */
export function ParaSecici() {
  const renk = useRenkler();
  const para = usePara();
  const kur = useKur();
  const [acik, setAcik] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setAcik(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Para birimini değiştir"
        style={[s.dugme, { backgroundColor: para === "TRY" ? renk.cardAlt : renk.aksan }]}
      >
        <Text style={[s.dugmeSembol, { color: para === "TRY" ? renk.text : renk.aksanUstu }]}>{SEMBOL[para]}</Text>
        <Ionicons name="swap-horizontal" size={13} color={para === "TRY" ? renk.textMuted : renk.aksanUstu} />
      </Pressable>

      <Modal visible={acik} transparent animationType="fade" onRequestClose={() => setAcik(false)} statusBarTranslucent>
        <Pressable style={s.arka} onPress={() => setAcik(false)}>
          <Pressable style={[s.kart, { backgroundColor: renk.card }]} onPress={() => {}}>
            <Text style={[T.heading, { color: renk.text }]}>Para birimi</Text>
            <Text style={{ color: renk.textMuted, fontSize: 13, lineHeight: 19 }}>
              Kayıtların TL olarak saklanır. Dolar ya da euro seçince her kayıt{" "}
              <Text style={{ color: renk.text, fontWeight: "700" }}>kendi gününün kuruyla</Text> çevrilir —
              geçmiş harcamaların gerçek döviz karşılığını görürsün.
            </Text>

            <View style={{ gap: SP.sm, marginTop: SP.xs }}>
              {PARALAR.map((p) => {
                const secili = p === para;
                const deger = p === "TRY" ? null : kur.data?.[p];
                return (
                  <Pressable
                    key={p}
                    onPress={() => {
                      paraSec(p);
                      setAcik(false);
                    }}
                    style={[
                      s.secenek,
                      { borderColor: secili ? renk.aksan : renk.border, backgroundColor: secili ? renk.aksanSoft : "transparent" },
                    ]}
                  >
                    <View style={[s.sembolDaire, { backgroundColor: secili ? renk.aksan : renk.cardAlt }]}>
                      <Text style={{ color: secili ? renk.aksanUstu : renk.text, fontSize: 17, fontWeight: "800" }}>
                        {SEMBOL[p]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: renk.text, fontWeight: "700", fontSize: 15 }}>{PARA_AD[p]}</Text>
                      {deger ? (
                        <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 1 }}>
                          1 {SEMBOL[p]} = {kurMetni(deger)} ₺
                        </Text>
                      ) : p !== "TRY" ? (
                        <Text style={{ color: renk.textFaint, fontSize: 12.5, marginTop: 1 }}>
                          {kur.isLoading ? "Kur alınıyor…" : "Kur şu an alınamadı"}
                        </Text>
                      ) : null}
                    </View>
                    {secili && <Ionicons name="checkmark-circle" size={22} color={renk.aksan} />}
                  </Pressable>
                );
              })}
            </View>

            {kur.data?.tarih && (
              <Text style={{ color: renk.textFaint, fontSize: 11.5, textAlign: "center" }}>
                Kaynak: TCMB döviz satış kuru · {tarihEtiket(kur.data.tarih)}
                {kur.data.kaynak === "ecb" ? " (yedek: Avrupa Merkez Bankası)" : ""}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  dugme: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 36,
    minWidth: 36,
    paddingHorizontal: 9,
    borderRadius: 18,
    justifyContent: "center",
  },
  dugmeSembol: { fontSize: 16, fontWeight: "800" },
  arka: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: SP.lg },
  kart: { borderRadius: R.xl, padding: SP.lg, gap: SP.md },
  secenek: { flexDirection: "row", alignItems: "center", gap: SP.md, padding: SP.md, borderRadius: R.md, borderWidth: 1 },
  sembolDaire: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
