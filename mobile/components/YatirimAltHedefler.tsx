import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Kart } from "@/components/base";
import { Metin as Text } from "@/components/Metin";
import { turkceTutar } from "@/lib/format";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useKategoriRenk } from "@/lib/kategoriRenk";
import { useCategories, useDeleteGoal, useSeedBolum, useSetGoal } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
import type { YatirimIlerleme } from "@/lib/types";

type Props = {
  yatirim: YatirimIlerleme | null | undefined;
  /** Hedefler ekranının tutar penceresi (kaydet bitene kadar açık kalır). */
  tutarSor: (baslik: string, mevcut: number | undefined, kaydet: (n: number) => Promise<void>) => void;
  bekle: (p: Promise<unknown>) => Promise<void>;
  onHata: (e: unknown) => void;
};

/**
 * Yatırım kategorilerinin (Altın/Döviz, Hisse Senedi…) ayrı aylık hedefleri. Alt hedefler
 * değişince sunucu genel yatırım hedefini toplamla senkron tutar; kullanıcı genel hedefi
 * bilerek farklı koyduysa burada fark gösterilir ve tek dokunuşla eşitlenebilir.
 */
export function YatirimAltHedefler({ yatirim, tutarSor, bekle, onHata }: Props) {
  const renk = useRenkler();
  const katRenk = useKategoriRenk();
  const router = useRouter();
  const kategoriler = useCategories();
  const setGoal = useSetGoal();
  const delGoal = useDeleteGoal();
  const bolumEkle = useSeedBolum();

  const yatirimKat = (kategoriler.data ?? []).filter((k) => k.tip === "yatirim" && k.is_active !== false);
  const alt = new Map((yatirim?.kategoriler ?? []).map((x) => [x.kategori, x]));
  const genel = yatirim?.hedef ?? 0;
  const toplam = yatirim?.alt_toplam ?? 0;
  const fark = Math.round((genel - toplam) * 100) / 100;

  return (
    <Kart>
      <View style={s.ust}>
        <Text style={[T.heading, { color: renk.text }]}>Yatırım hedeflerin</Text>
        <Pressable onPress={() => router.navigate("/kategori-yonet")} hitSlop={8}>
          <Text style={{ color: renk.aksan, fontWeight: "700", fontSize: 13 }}>Kategorileri düzenle</Text>
        </Pressable>
      </View>
      <Text style={{ color: renk.textFaint, fontSize: 12.5, marginBottom: SP.md }}>
        Her yatırım türüne ayrı aylık hedef koy; toplamları genel yatırım hedefini günceller.
      </Text>

      {kategoriler.isLoading ? (
        <ActivityIndicator color={renk.aksan} style={{ paddingVertical: SP.lg }} />
      ) : yatirimKat.length === 0 ? (
        <View style={{ alignItems: "center", gap: SP.sm, paddingVertical: SP.sm }}>
          <Text style={{ color: renk.textMuted, fontSize: 13, textAlign: "center" }}>
            Henüz yatırım kategorin yok. Altın, borsa, kripto, fon gibi hazır kategorileri ekleyebilirsin.
          </Text>
          <Pressable
            onPress={() => bolumEkle.mutate("yatirim", { onError: onHata })}
            disabled={bolumEkle.isPending}
            style={[s.ekleBtn, { backgroundColor: renk.aksan }]}
          >
            {bolumEkle.isPending ? (
              <ActivityIndicator size="small" color={renk.aksanUstu} />
            ) : (
              <Text style={{ color: renk.aksanUstu, fontWeight: "700" }}>Yatırım kategorilerini ekle</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: SP.sm }}>
          {yatirimKat.map((k) => {
            const h = alt.get(k.name);
            const oran = h?.oran ?? 0;
            const tamam = oran >= 100;
            const silen = delGoal.isPending && delGoal.variables === k.name;
            return (
              <Pressable
                key={k.id}
                onPress={() =>
                  tutarSor(`${k.name} — aylık hedef`, h?.hedef, (n) =>
                    bekle(setGoal.mutateAsync({ tutar: n, kategori: k.name })),
                  )
                }
                style={[s.satir, { backgroundColor: renk.aksanSoft }]}
              >
                <View style={[s.ikon, { backgroundColor: katRenk(k.name) + "26" }]}>
                  <Ionicons name={kategoriIkon(k.name)} size={18} color={katRenk(k.name)} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.satirUst}>
                    <Text style={{ color: renk.text, fontWeight: "600", fontSize: 14.5 }}>{k.name}</Text>
                    {h && (
                      <Text style={{ color: tamam ? renk.aksan : renk.textMuted, fontSize: 13, fontWeight: "800" }}>
                        {tamam ? "✓ " : ""}%{Math.round(oran)}
                      </Text>
                    )}
                  </View>
                  {h ? (
                    <>
                      <View style={[s.ray, { backgroundColor: renk.hairline }]}>
                        <View
                          style={{
                            width: `${Math.min(100, Math.max(2, oran))}%`,
                            height: "100%",
                            borderRadius: R.pill,
                            backgroundColor: renk.aksan,
                          }}
                        />
                      </View>
                      <Text style={{ color: renk.textMuted, fontSize: 11.5, marginTop: 3 }}>
                        {turkceTutar(h.birikmis)} / {turkceTutar(h.hedef)} ₺
                        {h.kalan > 0 ? `  ·  ${turkceTutar(h.kalan)} ₺ kaldı` : "  ·  hedefe ulaştın"}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: renk.textFaint, fontSize: 12, marginTop: 2 }}>Hedef yok — dokunup ekle</Text>
                  )}
                </View>
                {h && (
                  <Pressable onPress={() => delGoal.mutate(k.name, { onError: onHata })} disabled={silen} hitSlop={10}>
                    {silen ? (
                      <ActivityIndicator size={20} color={renk.textFaint} />
                    ) : (
                      <Ionicons name="close-circle" size={20} color={renk.textFaint} />
                    )}
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {toplam > 0 && Math.abs(fark) >= 0.01 && (
        <View
          style={[
            s.uyari,
            { backgroundColor: (fark < 0 ? renk.warn : renk.aksan) + "1F", borderColor: fark < 0 ? renk.warn : renk.aksan },
          ]}
        >
          <Ionicons
            name={fark < 0 ? "warning-outline" : "information-circle-outline"}
            size={18}
            color={fark < 0 ? renk.warn : renk.aksan}
          />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: renk.text, fontSize: 12.5, lineHeight: 18 }}>
              {fark < 0
                ? `Alt hedeflerin toplamı (${turkceTutar(toplam)} ₺) genel yatırım hedefinden ${
                    genel > 0 ? `(${turkceTutar(genel)} ₺) ` : ""
                  }fazla.`
                : `Genel hedefinin ${turkceTutar(fark)} ₺'si henüz bir yatırım türüne dağıtılmadı (alt hedefler toplamı ${turkceTutar(toplam)} ₺).`}
            </Text>
            <Pressable
              onPress={() => setGoal.mutate(toplam, { onError: onHata })}
              disabled={setGoal.isPending}
              hitSlop={6}
            >
              <Text style={{ color: fark < 0 ? renk.warn : renk.aksan, fontWeight: "800", fontSize: 12.5 }}>
                {setGoal.isPending ? "Güncelleniyor…" : `Genel hedefi ${turkceTutar(toplam)} ₺ yap`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Kart>
  );
}

const s = StyleSheet.create({
  ust: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md, padding: SP.md, borderRadius: R.md },
  ikon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  satirUst: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ray: { height: 6, borderRadius: R.pill, overflow: "hidden", marginTop: 5 },
  ekleBtn: { paddingHorizontal: SP.lg, paddingVertical: 10, borderRadius: R.pill, marginTop: 4 },
  uyari: { flexDirection: "row", gap: SP.sm, padding: SP.md, borderRadius: R.md, borderWidth: 1, marginTop: SP.md },
});
