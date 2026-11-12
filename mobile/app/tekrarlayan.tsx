import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Kart } from "@/components/base";
import { Metin as Text } from "@/components/Metin";
import { kisaTarih } from "@/components/TarihAraligi";
import { useUyari } from "@/components/Uyari";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { api, ApiError } from "@/lib/api";
import { turkceTutar } from "@/lib/format";
import { hataMesaji } from "@/lib/hata";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useKategoriRenk } from "@/lib/kategoriRenk";
import { useTekrarlayanlar, useTekrarlayanMutasyon } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
import type { Tekrarlayan } from "@/lib/types";

/** Her ay otomatik eklenen kayıtlar: aç/kapat, sil, yenisini ekle. */
export default function TekrarlayanEkrani() {
  const renk = useRenkler();
  const router = useRouter();
  const uyari = useUyari();
  const katRenk = useKategoriRenk();
  const liste = useTekrarlayanlar();
  const degistir = useTekrarlayanMutasyon((v: { id: string; aktif: boolean }) =>
    api.tekrarlayanGuncelle(v.id, { aktif: v.aktif }),
  );
  const sil = useTekrarlayanMutasyon((id: string) => api.tekrarlayanSil(id));

  const hata = (e: unknown) => {
    if (e instanceof ApiError && e.status === 402) {
      uyari("Pro gerekli", "Free planda en çok 3 tekrarlayan kayıt açık olabilir. Pro'da sınır yok.", [
        { yazi: "Tamam", stil: "vazgec" },
        { yazi: "Pro'ya bak", onPress: () => router.push({ pathname: "/uyelik", params: { neden: "tekrarlayan" } }) },
      ]);
    } else {
      uyari("İşlem yapılamadı", hataMesaji(e, undefined, { ekran: "tekrarlayan" }));
    }
  };

  const silSor = (k: Tekrarlayan) =>
    uyari(k.aciklama, "Bu tekrarlayan kayıt silinsin mi? Daha önce eklenmiş kayıtlar silinmez.", [
      { yazi: "Vazgeç", stil: "vazgec" },
      { yazi: "Sil", stil: "tehlike", onPress: () => sil.mutate(k.id, { onError: hata }) },
    ]);

  const kayitlar = liste.data ?? [];
  const aylikGider = kayitlar.filter((k) => k.aktif && k.direction === "gider").reduce((t, k) => t + k.tutar, 0);
  const aylikGelir = kayitlar.filter((k) => k.aktif && k.direction === "gelir").reduce((t, k) => t + k.tutar, 0);

  return (
    <ScrollView
      style={{ backgroundColor: renk.bg }}
      contentContainerStyle={s.icerik}
      refreshControl={<RefreshControl refreshing={liste.isRefetching} onRefresh={() => liste.refetch()} tintColor={renk.aksan} />}
    >
      <Kart style={{ backgroundColor: renk.aksanSoft }}>
        <View style={s.bilgiSatir}>
          <Ionicons name="repeat" size={22} color={renk.aksan} />
          <Text style={{ color: renk.text, fontSize: 13.5, lineHeight: 19, flex: 1 }}>
            Kira, fatura, abonelik ya da maaş gibi her ay aynı olan kayıtlar, ayın seçtiğin günü otomatik eklenir.
            Uygulamayı o gün açmasan da bir sonraki açılışında eklenir.
          </Text>
        </View>
        {(aylikGider > 0 || aylikGelir > 0) && (
          <View style={[s.toplamSatir, { borderTopColor: renk.hairline }]}>
            {aylikGider > 0 && (
              <Text style={{ color: renk.textMuted, fontSize: 13 }}>
                Aylık sabit gider: <Text style={{ color: renk.text, fontWeight: "800" }}>{turkceTutar(aylikGider)} ₺</Text>
              </Text>
            )}
            {aylikGelir > 0 && (
              <Text style={{ color: renk.textMuted, fontSize: 13 }}>
                Aylık sabit gelir: <Text style={{ color: renk.success, fontWeight: "800" }}>{turkceTutar(aylikGelir)} ₺</Text>
              </Text>
            )}
          </View>
        )}
      </Kart>

      {liste.isLoading ? (
        <YuklemeHalkasi boyut={56} yukseklik={160} yazi="Yükleniyor" />
      ) : kayitlar.length === 0 ? (
        <Text style={[T.body, { color: renk.textFaint, textAlign: "center", paddingVertical: SP.xl }]}>
          {liste.isError ? "Liste yüklenemedi. Yenilemek için aşağı çek." : "Henüz tekrarlayan kaydın yok."}
        </Text>
      ) : (
        <View style={{ gap: SP.sm }}>
          {kayitlar.map((k) => {
            const bekliyor =
              (degistir.isPending && degistir.variables?.id === k.id) || (sil.isPending && sil.variables === k.id);
            return (
              <Kart key={k.id} style={{ opacity: k.aktif ? 1 : 0.55 }}>
                <View style={s.satir}>
                  <View style={[s.ikon, { backgroundColor: renk.cardAlt }]}>
                    <Ionicons name={kategoriIkon(k.kategori)} size={18} color={katRenk(k.kategori)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                      {k.aciklama}
                    </Text>
                    <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 1 }} numberOfLines={1}>
                      Her ayın {k.gun}. günü · {k.kategori || "Kategorisiz"}
                    </Text>
                    <Text style={{ color: renk.textFaint, fontSize: 12, marginTop: 1 }}>
                      {k.aktif ? `Sonraki: ${kisaTarih(k.sonraki)}` : "Durduruldu"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text
                      style={{ color: k.direction === "gelir" ? renk.success : renk.text, fontSize: 15, fontWeight: "800" }}
                    >
                      {k.direction === "gelir" ? "+" : "-"}
                      {turkceTutar(k.tutar)} ₺
                    </Text>
                    {bekliyor ? (
                      <ActivityIndicator size="small" color={renk.aksan} />
                    ) : (
                      <View style={s.kontroller}>
                        <Pressable hitSlop={10} onPress={() => silSor(k)}>
                          <Ionicons name="trash-outline" size={19} color={renk.textFaint} />
                        </Pressable>
                        <Switch
                          value={k.aktif}
                          onValueChange={(v) => degistir.mutate({ id: k.id, aktif: v }, { onError: hata })}
                          trackColor={{ true: renk.aksan, false: renk.border }}
                          thumbColor="#fff"
                        />
                      </View>
                    )}
                  </View>
                </View>
              </Kart>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={() => router.push({ pathname: "/islem-form", params: { tekrar: "1" } })}
        style={[s.ekle, { backgroundColor: renk.aksan }]}
      >
        <Ionicons name="add" size={20} color={renk.aksanUstu} />
        <Text style={{ color: renk.aksanUstu, fontWeight: "800", fontSize: 15 }}>Tekrarlayan kayıt ekle</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.md, paddingBottom: 60 },
  bilgiSatir: { flexDirection: "row", gap: SP.md, alignItems: "flex-start" },
  toplamSatir: { marginTop: SP.md, paddingTop: SP.md, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md },
  ikon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kontroller: { flexDirection: "row", alignItems: "center", gap: SP.md },
  ekle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SP.sm,
    borderRadius: R.pill,
    paddingVertical: 14,
    marginTop: SP.sm,
  },
});
