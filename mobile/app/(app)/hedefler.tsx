import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Kart } from "@/components/base";
import { EkranBasligi } from "@/components/EkranBasligi";
import { HedefHalkasi } from "@/components/HedefHalkasi";
import { Metin as Text } from "@/components/Metin";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { turkceTutar } from "@/lib/format";
import {
  useBudgets,
  useCategories,
  useDeleteBudget,
  useSetBudget,
  useSetGoal,
  useSummary,
} from "@/lib/queries";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";
import { TIP_ETIKET, type Tip } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];

export default function Hedefler() {
  const renk = useRenkler();
  const router = useRouter();
  const ozet = useSummary("month");
  const butceler = useBudgets();
  const kategoriler = useCategories();
  const setBudget = useSetBudget();
  const delBudget = useDeleteBudget();
  const setGoal = useSetGoal();

  const g = ozet.data?.bu_donem;
  const yatirim = ozet.data?.yatirim;
  const genel = butceler.data?.find((b) => b.kapsam === "genel");
  const genelH = ozet.data?.hedefler.find((h) => h.kapsam === "genel");
  const katLimit = (ad: string) =>
    butceler.data?.find((b) => b.kapsam === "kategori" && b.kapsam_deger === ad);
  const katHarcama = (ad: string) =>
    (g?.kategori_kirilim ?? []).filter((x) => x.kategori === ad).reduce((s, x) => s + x.tutar, 0);

  function tutarSor(baslik: string, mevcut: number | undefined, kaydet: (n: number) => void) {
    if (Alert.prompt) {
      Alert.prompt(
        baslik,
        "₺ tutar",
        (v) => {
          const n = Number(String(v).replace(/[^\d,.-]/g, "").replace(",", "."));
          if (n > 0) kaydet(n);
        },
        "plain-text",
        mevcut ? String(mevcut) : "",
        "numeric",
      );
    } else {
      setDialog({ baslik, deger: mevcut ? String(mevcut) : "", kaydet });
    }
  }

  const [dialog, setDialog] = useState<{ baslik: string; deger: string; kaydet: (n: number) => void } | null>(null);
  const [katTip, setKatTip] = useState<Tip>("kisisel");

  return (
    <EkranBasligi
      baslik="Hedefler"
      onRefresh={() => {
        ozet.refetch();
        butceler.refetch();
      }}
      refreshing={butceler.isRefetching}
    >
      {/* Yatırım hedefi */}
      <Kart style={{ backgroundColor: renk.aksan }}>
        <View style={s.yatirimSatir}>
          <HedefHalkasi oran={yatirim?.oran ?? 0} ikon="trending-up-outline" boyut={92} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[s.kEtiket, { color: renk.aksanUstu }]}>Aylık yatırım hedefi</Text>
            <Text style={[s.kDeger, { color: renk.aksanUstu }]}>
              {yatirim && yatirim.hedef > 0 ? `${turkceTutar(yatirim.hedef)} ₺` : "belirlenmedi"}
            </Text>
            <Text style={[s.kAlt, { color: renk.aksanUstu }]}>
              Bu ay biriken: {turkceTutar(yatirim?.birikmis ?? 0)} ₺
              {yatirim && yatirim.hedef > 0 ? ` · kalan ${turkceTutar(yatirim.kalan)} ₺` : ""}
            </Text>
            <Pressable
              onPress={() => tutarSor("Yatırım hedefi", yatirim?.hedef, (n) => setGoal.mutate(n))}
              style={[s.miniBtn, { backgroundColor: renk.aksanSoft }]}
            >
              <Text style={{ color: renk.text, fontSize: 12.5, fontWeight: "700" }}>
                {yatirim && yatirim.hedef > 0 ? "Değiştir" : "Belirle"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Kart>

      {/* Genel aylık harcama hedefi */}
      <Kart>
        <View style={s.genelUst}>
          <Text style={[T.heading, { color: renk.text }]}>Aylık harcama sınırı</Text>
          <Pressable
            onPress={() =>
              tutarSor("Aylık harcama sınırı", genel?.limit_amount, (n) =>
                setBudget.mutate({ kapsam: "genel", limit_amount: n }),
              )
            }
          >
            <Text style={{ color: renk.accent, fontWeight: "700", fontSize: 13 }}>
              {genel ? "Değiştir" : "Belirle"}
            </Text>
          </Pressable>
        </View>
        {genelH ? (
          <>
            <View style={[s.ray, { backgroundColor: renk.hairline }]}>
              <View
                style={{
                  width: `${Math.min(100, Math.max(3, genelH.oran))}%`,
                  height: "100%",
                  borderRadius: R.pill,
                  backgroundColor: genelH.durum === "asti" ? renk.danger : genelH.durum === "yaklasti" ? renk.warn : renk.aksan,
                }}
              />
            </View>
            <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 6 }}>
              {turkceTutar(genelH.harcanan)} / {turkceTutar(genelH.limit)} ₺ · %{Math.round(genelH.oran)}
            </Text>
          </>
        ) : (
          <Text style={{ color: renk.textFaint, fontSize: 13, marginTop: 4 }}>
            Ay boyunca toplam harcama üst sınırı koy; sınıra yaklaşınca bildirim gelsin.
          </Text>
        )}
      </Kart>

      {/* Kategori limitleri */}
      <View style={s.katBaslikSatir}>
        <Text style={[T.heading, { color: renk.text }]}>Kategori limitleri</Text>
        <Pressable onPress={() => router.navigate("/kategori-yonet")}>
          <Text style={{ color: renk.accent, fontWeight: "700", fontSize: 13 }}>Kategorileri düzenle</Text>
        </Pressable>
      </View>

      <View style={s.tipSira}>
        {TIPLER.map((t) => (
          <Pressable
            key={t}
            onPress={() => setKatTip(t)}
            style={[s.tipSek, { backgroundColor: t === katTip ? renk.aksan : renk.card }]}
          >
            <Text
              style={{
                color: t === katTip ? renk.aksanUstu : renk.textMuted,
                fontSize: 13,
                fontWeight: t === katTip ? "700" : "500",
              }}
            >
              {TIP_ETIKET[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: SP.sm }}>
        {(kategoriler.data ?? []).filter((k) => k.tip === katTip).length === 0 && (
          <Text style={{ color: renk.textFaint, fontSize: 13, paddingVertical: SP.md, textAlign: "center" }}>
            Bu türde kategori yok.
          </Text>
        )}
        {(kategoriler.data ?? []).filter((k) => k.tip === katTip).map((k) => {
          const b = katLimit(k.name);
          const harcanan = katHarcama(k.name);
          const oran = b ? (harcanan / b.limit_amount) * 100 : 0;
          return (
            <Pressable
              key={k.id}
              onPress={() =>
                tutarSor(`${k.name} — aylık limit`, b?.limit_amount, (n) =>
                  setBudget.mutate({ kapsam: "kategori", kapsam_deger: k.name, limit_amount: n }),
                )
              }
              style={[s.katSatir, { backgroundColor: renk.card }]}
            >
              <View style={[s.katIkon, { backgroundColor: (k.color || renk.blue) + "22" }]}>
                <Ionicons name={kategoriIkon(k.name)} size={18} color={k.color || renk.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: renk.text, fontWeight: "600", fontSize: 14.5 }}>{k.name}</Text>
                {b ? (
                  <>
                    <View style={[s.katRay, { backgroundColor: renk.hairline }]}>
                      <View
                        style={{
                          width: `${Math.min(100, Math.max(2, oran))}%`,
                          height: "100%",
                          borderRadius: R.pill,
                          backgroundColor: oran >= 100 ? renk.danger : oran >= 80 ? renk.warn : renk.aksan,
                        }}
                      />
                    </View>
                    <Text style={{ color: renk.textMuted, fontSize: 11.5, marginTop: 3 }}>
                      {turkceTutar(harcanan)} / {turkceTutar(b.limit_amount)} ₺
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: renk.textFaint, fontSize: 12 }}>limit yok · dokun</Text>
                )}
              </View>
              {b && (
                <Pressable onPress={() => delBudget.mutate(b.id)} hitSlop={10}>
                  <Ionicons name="close-circle" size={20} color={renk.textFaint} />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </View>

      {dialog && (
        <View style={s.dialogArka}>
          <View style={[s.dialog, { backgroundColor: renk.card }]}>
            <Text style={[T.heading, { color: renk.text }]}>{dialog.baslik}</Text>
            <TextInput
              style={[s.dialogInput, { color: renk.text, backgroundColor: renk.aksanSoft }]}
              keyboardType="numeric"
              autoFocus
              defaultValue={dialog.deger}
              onChangeText={(v) => setDialog({ ...dialog, deger: v })}
              placeholder="₺ tutar"
              placeholderTextColor={renk.textFaint}
            />
            <View style={{ flexDirection: "row", gap: SP.sm }}>
              <Pressable style={[s.dialogBtn, { borderColor: renk.border }]} onPress={() => setDialog(null)}>
                <Text style={{ color: renk.textMuted, fontWeight: "700" }}>Vazgeç</Text>
              </Pressable>
              <Pressable
                style={[s.dialogBtn, { backgroundColor: renk.aksan }]}
                onPress={() => {
                  const n = Number(dialog.deger.replace(",", "."));
                  if (n > 0) dialog.kaydet(n);
                  setDialog(null);
                }}
              >
                <Text style={{ color: renk.aksanUstu, fontWeight: "700" }}>Kaydet</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </EkranBasligi>
  );
}

const s = StyleSheet.create({
  yatirimSatir: { flexDirection: "row", alignItems: "center", gap: SP.lg },
  kEtiket: { fontSize: 12.5, fontWeight: "600" },
  kDeger: { fontSize: 18, fontWeight: "800" },
  kAlt: { fontSize: 12, opacity: 0.85 },
  miniBtn: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, marginTop: 4 },
  genelUst: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md },
  ray: { height: 10, borderRadius: R.pill, overflow: "hidden" },
  katBaslikSatir: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SP.xs },
  tipSira: { flexDirection: "row", gap: SP.xs },
  tipSek: { flex: 1, paddingVertical: 9, borderRadius: R.pill, alignItems: "center" },
  katSatir: { flexDirection: "row", alignItems: "center", gap: SP.md, padding: SP.md, borderRadius: R.md },
  katIkon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  katRay: { height: 6, borderRadius: R.pill, overflow: "hidden", marginTop: 5 },
  dialogArka: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: SP.xl,
  },
  dialog: { width: "100%", borderRadius: R.lg, padding: SP.lg, gap: SP.md },
  dialogInput: { borderRadius: R.sm, padding: 12, fontSize: 16, fontFamily: FONT["600"] },
  dialogBtn: { flex: 1, borderWidth: 1, borderRadius: R.sm, paddingVertical: 12, alignItems: "center" },
});
