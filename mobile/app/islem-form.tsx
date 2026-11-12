import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Buton } from "@/components/Buton";
import { EnerjiRozeti, EnerjiSheet, type EnerjiSheetDurum } from "@/components/EnerjiSheet";
import { IslemFormu, type IslemAlanlari } from "@/components/IslemFormu";
import { IslemKatmani, useIslemKatmani } from "@/components/IslemKatmani";
import { Metin as Text } from "@/components/Metin";
import { useUyari } from "@/components/Uyari";
import { ApiError, api } from "@/lib/api";
import { useIslemSil } from "@/lib/islemSil";
import { reklamIzleVeTekrarDene } from "@/lib/kullanim402";
import { useMe, usePatchTransaction, useSaveTransactions } from "@/lib/queries";
import { reklamAktif } from "@/lib/reklam";
import { R, SP, T, useRenkler } from "@/lib/theme";
import type { Islem, Tip, Yon } from "@/lib/types";
import { hataMesaji } from "@/lib/hata";

function bugun(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function IslemForm() {
  const renk = useRenkler();
  const router = useRouter();
  const qc = useQueryClient();
  // islem: düzenleme · sablon: hızlı ekle çipi (son kayıtlardan dolu, tarih bugün) · tekrar=1: "Her ay tekrarla" açık başlar
  const { islem, sablon, tekrar: tekrarParam } = useLocalSearchParams<{ islem?: string; sablon?: string; tekrar?: string }>();
  const mevcut: Islem | null = islem ? JSON.parse(String(islem)) : null;
  const tohum: Partial<{ aciklama: string; tutar: number; kategori: string; tip: Tip; direction: Yon }> =
    mevcut ?? (sablon ? JSON.parse(String(sablon)) : {});
  const patch = usePatchTransaction();
  const kaydetYeni = useSaveTransactions();
  const islemSil = useIslemSil();
  const [tekrar, setTekrar] = useState(tekrarParam === "1");
  const tekrarHata = useRef<unknown>(null);

  const [alan, setAlan] = useState<IslemAlanlari>({
    aciklama: tohum.aciklama ?? "",
    tutar: tohum.tutar ?? 0,
    kategori: tohum.kategori ?? "",
    tip: tohum.tip ?? "kisisel",
    direction: tohum.direction ?? "gider",
    tarih: mevcut?.tarih ?? bugun(),
  });
  const uyari = useUyari();
  const katman = useIslemKatmani();
  const mesgul = katman.durum !== null;
  const me = useMe();
  const [sheetAcik, setSheetAcik] = useState(false);
  const [sheetDurum, setSheetDurum] = useState<EnerjiSheetDurum>(null);

  const guncelle = (yama: Partial<IslemAlanlari>) => setAlan((e) => ({ ...e, ...yama }));

  async function kaydet() {
    if (!(alan.tutar > 0)) return uyari("Geçersiz tutar", "Tutar 0'dan büyük olmalı.");
    if (!alan.aciklama.trim()) return uyari("Başlık gerekli");
    try {
      await katman.calistir({
        bekleyen: mevcut ? "Güncelleniyor" : "Kaydediliyor",
        basarili: mevcut ? "Güncellendi" : "Kaydedildi",
        is: async () => {
          if (mevcut) return patch.mutateAsync({ id: mevcut.id, alanlar: alan });
          await kaydetYeni.mutateAsync([{ ...alan, para_birimi: "TRY", emin: true, inceleme_sebepleri: [] }]);
          tekrarHata.current = null;
          if (tekrar) {
            // Kayıt zaten eklendi: kural bu ayı "eklendi" sayar, bir sonraki ay aynı gün ekler.
            // Kural kurulamazsa kayıt yine kalır — ayrı uyarılır, kullanıcı tekrar kaydetmesin.
            try {
              await api.tekrarlayanEkle({
                aciklama: alan.aciklama.trim(),
                tutar: alan.tutar,
                kategori: alan.kategori,
                tip: alan.tip,
                direction: alan.direction,
                gun: Number(alan.tarih.slice(8, 10)),
                baslangic: alan.tarih,
                son_eklenen: alan.tarih,
              });
              qc.invalidateQueries({ queryKey: ["tekrarlayan"] });
            } catch (e) {
              tekrarHata.current = e;
            }
          }
        },
        sonra: () => {
          router.back();
          const e = tekrarHata.current;
          if (!e) return;
          if (e instanceof ApiError && e.status === 402) {
            uyari("Kayıt eklendi, tekrar kurulmadı", "Free planda en çok 3 tekrarlayan kayıt olabilir. Pro'da sınır yok.", [
              { yazi: "Tamam", stil: "vazgec" },
              { yazi: "Pro'ya bak", onPress: () => router.push("/uyelik") },
            ]);
          } else {
            uyari("Kayıt eklendi, tekrar kurulmadı", hataMesaji(e, undefined, { ekran: "islem-form" }));
          }
        },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        await qc.invalidateQueries({ queryKey: ["me"] });
        setSheetAcik(true);
        return;
      }
      uyari("Kaydedilemedi", hataMesaji(e, undefined, { ekran: "islem-form" }));
    }
  }

  async function reklamIzle() {
    await reklamIzleVeTekrarDene(
      qc,
      async () => {
        setSheetAcik(false);
        await kaydet();
      },
      uyari,
      setSheetDurum,
    );
  }

  function silSor() {
    if (!mevcut) return;
    uyari(mevcut.aciklama, "Bu kayıt silinsin mi?", [
      { yazi: "Vazgeç", stil: "vazgec" },
      {
        yazi: "Sil",
        stil: "tehlike",
        // Altta "Geri al" çıkar (bkz lib/islemSil) — önceki ekranda görünür
        onPress: async () => {
          if (await islemSil(mevcut, "islem-form")) router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top", "bottom"]}>
      <View style={s.baslikSatir}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: renk.textMuted, fontSize: 15, fontWeight: "600" }}>Vazgeç</Text>
        </Pressable>
        <Text style={[T.heading, { color: renk.text }]}>{mevcut ? "İşlemi düzenle" : "Elle ekle"}</Text>
        {mevcut ? (
          <Pressable onPress={silSor} hitSlop={12}>
            <Text style={{ color: renk.danger, fontSize: 15, fontWeight: "600" }}>Sil</Text>
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.icerik} keyboardShouldPersistTaps="handled">
          {!mevcut && <EnerjiRozeti ben={me.data} onPress={() => setSheetAcik(true)} />}
          <IslemFormu deger={alan} guncelle={guncelle} />
          {!mevcut && (
            <Pressable
              onPress={() => setTekrar((t) => !t)}
              style={[s.tekrar, { backgroundColor: renk.cardAlt }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }}>Her ay tekrarla</Text>
                <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 2 }}>
                  {tekrar
                    ? `Her ayın ${Number(alan.tarih.slice(8, 10))}. günü otomatik eklenir`
                    : "Kira, fatura, abonelik, maaş gibi her ay aynı olanlar için"}
                </Text>
              </View>
              <Switch
                value={tekrar}
                onValueChange={setTekrar}
                trackColor={{ true: renk.aksan, false: renk.border }}
                thumbColor="#fff"
              />
            </Pressable>
          )}
          <Buton
            yazi={mevcut ? "Kaydet" : "Ekle"}
            onPress={kaydet}
            yukleniyor={mesgul}
            style={{ marginTop: SP.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <IslemKatmani durum={katman.durum} />
      <EnerjiSheet
        acik={sheetAcik}
        onKapat={() => setSheetAcik(false)}
        ben={me.data}
        reklamGosterilebilir={reklamAktif()}
        durum={sheetDurum}
        onReklamIzle={reklamIzle}
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
  baslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  icerik: { padding: SP.lg, gap: SP.md, paddingBottom: 60 },
  _r: { borderRadius: R.md },
  tekrar: { flexDirection: "row", alignItems: "center", gap: SP.md, borderRadius: R.md, padding: SP.md },
});
