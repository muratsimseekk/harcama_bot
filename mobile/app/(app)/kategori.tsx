import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Buton } from "@/components/Buton";
import { EkranBasligi } from "@/components/EkranBasligi";
import { KategoriKutucuk } from "@/components/KategoriKutucuk";
import { Metin as Text } from "@/components/Metin";
import { turkceTutar } from "@/lib/format";
import {
  useBudgets,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useSetBudget,
  useSummary,
} from "@/lib/queries";
import { PALET, R, SP, T, useRenkler } from "@/lib/theme";
import { type Kategori, TIP_ETIKET, type Tip } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];

export default function KategoriEkran() {
  const renk = useRenkler();
  const liste = useCategories();
  const ozet = useSummary("month");
  const butceler = useBudgets();
  const olustur = useCreateCategory();
  const silKat = useDeleteCategory();
  const setBudget = useSetBudget();

  const [form, setForm] = useState(false);
  const [ad, setAd] = useState("");
  const [tip, setTip] = useState<Tip>("kisisel");
  const [renkSec, setRenkSec] = useState(PALET[0]);

  const g = ozet.data?.bu_donem;
  const katHarcama = (k: string) =>
    g?.kategori_kirilim.filter((x) => x.kategori === k).reduce((s, x) => s + x.tutar, 0) ?? 0;
  const butceOf = (k: string) =>
    butceler.data?.find((b) => b.kapsam === "kategori" && b.kapsam_deger === k);

  function ekle() {
    if (!ad.trim()) return;
    olustur.mutate(
      { name: ad.trim(), tip, color: renkSec },
      {
        onSuccess: () => {
          setAd("");
          setForm(false);
        },
        onError: (e) => Alert.alert("Eklenemedi", String(e)),
      },
    );
  }

  function kategoriDokun(k: Kategori) {
    const harcanan = katHarcama(k.name);
    const b = butceOf(k.name);
    Alert.alert(
      k.name,
      `Bu ay: ${turkceTutar(harcanan)} ₺` + (b ? `\nLimit: ${turkceTutar(b.limit_amount)} ₺` : ""),
      [
        { text: "Kapat", style: "cancel" },
        { text: b ? "Limiti değiştir" : "Limit koy", onPress: () => limitSor(k.name) },
        { text: "Kategoriyi sil", style: "destructive", onPress: () => silKat.mutate(k.id) },
      ],
    );
  }

  function limitSor(k: string) {
    Alert.prompt?.(
      `${k} — aylık limit`,
      "₺ tutar gir",
      (v) => {
        const n = Number(String(v).replace(",", "."));
        if (n > 0) setBudget.mutate({ kapsam: "kategori", kapsam_deger: k, limit_amount: n });
      },
      "plain-text",
      "",
      "numeric",
    );
  }

  return (
    <EkranBasligi
      baslik="Kategoriler"
      onRefresh={() => {
        liste.refetch();
        ozet.refetch();
        butceler.refetch();
      }}
      refreshing={liste.isRefetching}
      yesilAlan={
        g ? (
          <View style={s.ggSatir}>
            <Text style={[s.gg, { color: renk.onGreen }]}>
              ↗ {turkceTutar(g.toplam_gelir)} ₺
            </Text>
            <Text style={[s.gg, { color: renk.blue }]}>↘ -{turkceTutar(g.toplam_gider)} ₺</Text>
          </View>
        ) : undefined
      }
    >
      {form ? (
        <View style={[s.form, { backgroundColor: renk.greenSoft }]}>
          <Text style={[T.heading, { color: renk.text }]}>Yeni kategori</Text>
          <TextInput
            style={[s.input, { color: renk.text, backgroundColor: renk.bg }]}
            placeholder="ad (ör. Nargile)"
            placeholderTextColor={renk.textFaint}
            value={ad}
            onChangeText={setAd}
            autoFocus
          />
          <View style={s.tipSira}>
            {TIPLER.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTip(t)}
                style={[s.tipSec, { backgroundColor: t === tip ? renk.green : renk.bg }]}
              >
                <Text style={{ color: renk.text, fontSize: 12.5, fontWeight: t === tip ? "700" : "500" }}>
                  {TIP_ETIKET[t]}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.palet}>
            {PALET.map((c) => (
              <Pressable
                key={c}
                onPress={() => setRenkSec(c)}
                style={[s.renkNok, { backgroundColor: c, borderColor: c === renkSec ? renk.text : "transparent" }]}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: SP.sm }}>
            <Buton yazi="Vazgeç" varyant="ikincil" onPress={() => setForm(false)} style={{ flex: 1 }} />
            <Buton yazi="Ekle" onPress={ekle} yukleniyor={olustur.isPending} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}

      <View style={s.grid}>
        {(liste.data ?? []).map((k) => (
          <KategoriKutucuk key={k.id} ad={k.name} renkli={k.color} onPress={() => kategoriDokun(k)} />
        ))}
        <KategoriKutucuk ad="" ekle onPress={() => setForm((f) => !f)} />
      </View>

      {(liste.data ?? []).length === 0 && !liste.isLoading && (
        <Text style={{ color: renk.textFaint, textAlign: "center", paddingVertical: SP.xl }}>
          Kategori yok — SQL çalıştırıldı mı?
        </Text>
      )}
    </EkranBasligi>
  );
}

const s = StyleSheet.create({
  ggSatir: { flexDirection: "row", justifyContent: "space-between", paddingBottom: SP.md },
  gg: { fontSize: 16, fontWeight: "700" },
  form: { borderRadius: R.md, padding: SP.lg, gap: SP.md },
  input: { borderRadius: R.sm, padding: 12, fontSize: 15, fontFamily: "Poppins_500Medium" },
  tipSira: { flexDirection: "row", gap: SP.sm },
  tipSec: { flex: 1, borderRadius: R.sm, paddingVertical: 9, alignItems: "center" },
  palet: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  renkNok: { width: 26, height: 26, borderRadius: 13, borderWidth: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SP.md, rowGap: SP.xl, justifyContent: "space-between" },
});
