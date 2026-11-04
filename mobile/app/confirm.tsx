import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EnerjiSheet, type EnerjiSheetDurum, kalanHak } from "@/components/EnerjiSheet";
import { IslemFormu } from "@/components/IslemFormu";
import { Metin as Text } from "@/components/Metin";
import { IslemKatmani, useIslemKatmani } from "@/components/IslemKatmani";
import { useUyari } from "@/components/Uyari";
import { api, ApiError } from "@/lib/api";
import { turkceTutar } from "@/lib/format";
import { gerekenReklam, reklamIzleVeTekrarDene } from "@/lib/kullanim402";
import { useCategories, useCreateCategory, useMe, usePatchCategory } from "@/lib/queries";
import { reklamAktif, reklamOnYukle } from "@/lib/reklam";
import { golge, R, SP, useRenkler } from "@/lib/theme";
import type { Aday, CaptureYanit } from "@/lib/types";
import { hataMesaji } from "@/lib/hata";

export default function Confirm() {
  const renk = useRenkler();
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useLocalSearchParams<{ data: string }>();

  const yanit = useMemo<CaptureYanit>(() => JSON.parse(String(data)), [data]);
  const [adaylar, setAdaylar] = useState<Aday[]>(yanit.candidates);
  const uyari = useUyari();
  const katman = useIslemKatmani();
  const kaydediliyor = katman.durum !== null;
  const me = useMe();
  const [sheetAcik, setSheetAcik] = useState(false);
  const [sheetDurum, setSheetDurum] = useState<EnerjiSheetDurum>(null);
  const [reklamAdet, setReklamAdet] = useState(1);
  // Hak bu kayıtlara yetmeyecekse reklamı şimdiden yükle — 402 gelince beklemeden açılsın.
  const hakYetmez = !!me.data && me.data.plan !== "pro" && kalanHak(me.data) < adaylar.length;
  useEffect(() => {
    if (hakYetmez) reklamOnYukle();
  }, [hakYetmez]);

  const toplam = adaylar.reduce((t, a) => t + (a.direction === "gelir" ? a.tutar : -a.tutar), 0);

  const guncelle = (i: number, yama: Partial<Aday>) =>
    setAdaylar((eski) => eski.map((a, j) => (j === i ? { ...a, ...yama } : a)));
  const sil = (i: number) => setAdaylar((eski) => eski.filter((_, j) => j !== i));

  const kategoriler = useCategories();
  const kategoriOlustur = useCreateCategory();
  const kategoriGuncelle = usePatchCategory();
  const oneriBekliyor = kategoriOlustur.isPending || kategoriGuncelle.isPending;

  /** AI'ın önerdiği kategoriyi oluştur (gizli hâli varsa aç), aynı öneriyi alan kayıtlara da uygula. */
  async function oneriKabul(a: Aday) {
    const ad = a.kategori_onerisi?.trim();
    if (!ad || oneriBekliyor) return;
    const tip = a.direction === "gelir" ? "gelir" : a.tip;
    const kucuk = (x: string) => x.toLocaleLowerCase("tr");
    try {
      const mevcut = kategoriler.data?.find((k) => k.tip === tip && kucuk(k.name) === kucuk(ad));
      if (mevcut && !mevcut.is_active) {
        await kategoriGuncelle.mutateAsync({ id: mevcut.id, body: { is_active: true } });
      }
      const kategori =
        mevcut ??
        (await kategoriOlustur.mutateAsync({
          name: ad,
          tip,
          keywords: a.aciklama.trim().length >= 3 ? [kucuk(a.aciklama.trim())] : [],
        }));
      setAdaylar((eski) =>
        eski.map((x) =>
          x.kategori_onerisi === a.kategori_onerisi && x.direction === a.direction && x.tip === a.tip
            ? {
                ...x,
                kategori: kategori.name,
                kategori_onerisi: "",
                neden: "", // "uygun kategori yok" gerekçesi artık geçersiz
                inceleme_sebepleri: x.inceleme_sebepleri.filter((sb) => sb !== "AI bu kayıttan emin değil"),
              }
            : x,
        ),
      );
    } catch (e) {
      uyari("Kategori oluşturulamadı", hataMesaji(e, undefined, { ekran: "confirm" }));
    }
  }

  async function onayla() {
    if (adaylar.length === 0) return router.back();
    for (const a of adaylar) {
      if (!(a.tutar > 0)) {
        uyari("Geçersiz tutar", `"${a.aciklama}" için tutar 0'dan büyük olmalı.`);
        return;
      }
      if (!a.kategori?.trim()) {
        uyari("Kategori gerekli", `"${a.aciklama}" için bir kategori seç veya oluştur.`);
        return;
      }
    }
    try {
      await katman.calistir({
        bekleyen: "Kaydediliyor",
        basarili: adaylar.length > 1 ? `${adaylar.length} kayıt eklendi` : "Kaydedildi",
        is: async () => {
          await api.saveTransactions(adaylar);
          await qc.invalidateQueries();
        },
        sonra: () => router.back(),
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        await qc.invalidateQueries({ queryKey: ["me"] });
        setReklamAdet(gerekenReklam(e.detail, adaylar.length));
        setSheetAcik(true);
        return;
      }
      uyari("Kaydedilemedi", hataMesaji(e, undefined, { ekran: "confirm" }));
    }
  }

  async function reklamIzle() {
    await reklamIzleVeTekrarDene(
      qc,
      async () => {
        setSheetAcik(false);
        await onayla();
      },
      uyari,
      setSheetDurum,
      reklamAdet,
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.liste} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {yanit.needs_review && (
          <View style={[s.uyari, { backgroundColor: renk.warnSoft }]}>
            <Ionicons name="alert-circle" size={16} color={renk.warn} />
            <Text style={{ color: renk.warn, fontSize: 14, flex: 1 }}>
              Bazı kayıtlar kontrol istiyor — düzelt, sonra onayla.
            </Text>
          </View>
        )}

        {adaylar.map((a, i) => (
          <View
            key={i}
            style={[
              s.kart,
              {
                backgroundColor: renk.card,
                borderColor: a.kategori?.trim() ? renk.border : renk.warn,
              },
              golge(1),
            ]}
          >
            {adaylar.length > 1 && (
              <Pressable onPress={() => sil(i)} hitSlop={10} style={s.silBtn}>
                <Ionicons name="close-circle" size={22} color={renk.textFaint} />
              </Pressable>
            )}
            {!a.kategori?.trim() && !!a.kategori_onerisi && (
              <View style={[s.oneri, { backgroundColor: renk.aksanSoft }]}>
                <View style={s.oneriUst}>
                  <Ionicons name="sparkles" size={16} color={renk.aksan} />
                  <Text style={{ color: renk.text, fontSize: 14, flex: 1 }}>
                    {a.direction === "gelir" ? "Bu gelirin" : "Bu harcamanın"} kategorisi yok.{" "}
                    <Text style={{ fontWeight: "700" }}>{a.kategori_onerisi}</Text> olsun mu?
                  </Text>
                </View>
                <View style={s.oneriButonlar}>
                  <Pressable
                    style={[s.oneriHayir, { borderColor: renk.border }]}
                    onPress={() => guncelle(i, { kategori_onerisi: "" })}
                    disabled={oneriBekliyor}
                  >
                    <Text style={{ color: renk.textMuted, fontWeight: "700", fontSize: 14 }}>Hayır</Text>
                  </Pressable>
                  <Pressable
                    style={[s.oneriEvet, { backgroundColor: renk.aksan }]}
                    onPress={() => oneriKabul(a)}
                    disabled={oneriBekliyor}
                  >
                    {oneriBekliyor ? (
                      <ActivityIndicator size="small" color={renk.aksanUstu} />
                    ) : (
                      <Text style={{ color: renk.aksanUstu, fontWeight: "700", fontSize: 14 }}>
                        Evet, oluştur
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
            <IslemFormu deger={a} guncelle={(yama) => guncelle(i, yama)} />
            {!!a.neden && (
              <Text style={{ color: renk.textFaint, fontSize: 13, fontStyle: "italic" }}>
                AI: {a.neden}
              </Text>
            )}
            {a.inceleme_sebepleri.some((sb) => sb !== "Kategori seçilmedi" || !a.kategori?.trim()) && (
              <View style={s.sebepler}>
                {a.inceleme_sebepleri.filter((sb) => sb !== "Kategori seçilmedi" || !a.kategori?.trim()).map((sb, k) => (
                  <Text key={k} style={[s.sebep, { backgroundColor: renk.warnSoft, color: renk.warn }]}>
                    {sb}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[s.altBar, { borderTopColor: renk.hairline, backgroundColor: renk.card }]}>
        <Text style={[s.toplam, { color: renk.textMuted }]}>
          {adaylar.length} kayıt · net {turkceTutar(Math.abs(toplam))} ₺
        </Text>
        <View style={s.butonlar}>
          <Pressable style={[s.iptal, { borderColor: renk.border }]} onPress={() => router.back()}>
            <Text style={{ color: renk.textMuted, fontWeight: "700" }}>İptal</Text>
          </Pressable>
          <Pressable style={[s.onay, { backgroundColor: renk.aksan }]} onPress={onayla} disabled={kaydediliyor}>
            {kaydediliyor ? (
              <ActivityIndicator color={renk.aksanUstu} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={renk.aksanUstu} />
                <Text style={{ color: renk.aksanUstu, fontWeight: "800", fontSize: 16 }}>Onayla</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <IslemKatmani durum={katman.durum} />
      <EnerjiSheet
        acik={sheetAcik}
        onKapat={() => setSheetAcik(false)}
        ben={me.data}
        reklamGosterilebilir={reklamAktif()}
        durum={sheetDurum}
        onReklamIzle={reklamIzle}
        gerekenReklam={reklamAdet}
        bekleyenKayit={adaylar.length}
        onProGec={() => {
          setSheetAcik(false);
          router.push("/uyelik");
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  liste: { padding: SP.lg, gap: SP.md },
  uyari: { flexDirection: "row", alignItems: "center", gap: SP.sm, padding: SP.md, borderRadius: R.md },
  kart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: R.lg, padding: SP.lg, gap: SP.md },
  silBtn: { position: "absolute", top: 8, right: 8, zIndex: 2 },
  oneri: { borderRadius: R.md, padding: SP.md, gap: SP.sm, marginTop: SP.md },
  oneriUst: { flexDirection: "row", gap: SP.sm, alignItems: "flex-start" },
  oneriButonlar: { flexDirection: "row", gap: SP.sm },
  oneriHayir: { flex: 1, borderWidth: 1, borderRadius: R.sm, paddingVertical: 9, alignItems: "center" },
  oneriEvet: { flex: 2, borderRadius: R.sm, paddingVertical: 9, alignItems: "center", justifyContent: "center" },
  sebepler: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sebep: { fontSize: 13, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm, overflow: "hidden" },
  altBar: { borderTopWidth: StyleSheet.hairlineWidth, padding: SP.lg, gap: SP.sm },
  toplam: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  butonlar: { flexDirection: "row", gap: SP.sm },
  iptal: { flex: 1, borderWidth: 1, borderRadius: R.md, paddingVertical: 14, alignItems: "center" },
  onay: { flex: 2, borderRadius: R.md, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
});
