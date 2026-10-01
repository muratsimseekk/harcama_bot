import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Kart, Sekmeli } from "@/components/base";
import { Metin as Text } from "@/components/Metin";
import { useUyari } from "@/components/Uyari";
import { PlanRozeti } from "@/components/PlanRozeti";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { useMe } from "@/lib/queries";
import { reklamAktif, reklamGoster } from "@/lib/reklam";
import {
  type EtkinPlan,
  type Paket,
  STATIK_FIYAT,
  geriYukle,
  satinAl,
  satinalmaAktif,
  teklifler,
} from "@/lib/satinalma";
import { R, SP, T, useRenkler } from "@/lib/theme";
import { hataMesaji } from "@/lib/hata";

type Hucre = boolean | string;
type Period = "aylik" | "yillik";

function ozellikler(gunlukEnerji: number): { ad: string; free: Hucre; pro: Hucre }[] {
  return [
    { ad: "Günlük kayıt hakkı (elle + AI)", free: `${gunlukEnerji}/gün + reklamla`, pro: "Sınırsız" },
    { ad: "Bütçe, hedef, özet & analiz", free: true, pro: true },
    { ad: "Hane / aile paylaşımı", free: false, pro: true },
    { ad: "Reklam", free: "Ödüllü video (isteğe bağlı)", pro: "Yok" },
  ];
}

// Mağazadan teklif gelmezse gösterilecek referans (STATIK_FIYAT'tan türetilir)
function statikPaket(period: Period): Paket {
  const id = `pro_${period}`;
  return { id, plan: "pro", period, fiyat: STATIK_FIYAT[id] ?? "", _rc: null };
}

export default function Uyelik() {
  const renk = useRenkler();
  const uyari = useUyari();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const gunlukEnerji = me.data?.gunluk_enerji ?? 3;
  const OZELLIKLER = ozellikler(gunlukEnerji);
  const mevcutPro = me.data?.plan === "pro";

  const [period, setPeriod] = useState<Period>("yillik");
  const [paket, setPaket] = useState<Paket | null>(null);
  const [yukleniyor, setYukleniyor] = useState(satinalmaAktif());
  const [islemde, setIslemde] = useState<string | null>(null);
  const [reklamIslemde, setReklamIslemde] = useState(false);

  useEffect(() => {
    if (!satinalmaAktif()) return;
    teklifler()
      .then((liste) => setPaket(liste.find((p) => p.period === period) ?? null))
      .finally(() => setYukleniyor(false));
  }, [period]);

  const aktifPaket = useCallback(
    (): Paket => paket ?? statikPaket(period),
    [paket, period],
  );

  async function planaGuncelle(sonuc: EtkinPlan, mesaj: string) {
    if (sonuc) {
      await me.refetch();
      uyari("Tamam", mesaj);
      router.back();
    }
  }

  async function sec() {
    if (!satinalmaAktif()) {
      uyari(
        "Abonelikler yakında",
        "Mağaza abonelikleri bir sonraki güncellemede açılacak.",
      );
      return;
    }
    const p = aktifPaket();
    if (!p._rc) {
      uyari("Hata", "Bu paket şu an mağazada bulunamadı. Daha sonra tekrar dene.");
      return;
    }
    setIslemde(p.id);
    try {
      const sonuc = await satinAl(p);
      await planaGuncelle(sonuc, "Üyeliğin güncellendi.");
    } catch (e) {
      uyari("Tamamlanamadı", hataMesaji(e, "Satın alma tamamlanamadı. Lütfen tekrar dene.", { ekran: "uyelik" }));
    } finally {
      setIslemde(null);
    }
  }

  async function geriYukleBas() {
    if (!satinalmaAktif()) return;
    setIslemde("restore");
    try {
      const sonuc = await geriYukle();
      if (sonuc) await planaGuncelle(sonuc, "Aboneliğin geri yüklendi.");
      else uyari("Bulunamadı", "Bu hesapta geri yüklenecek aktif abonelik yok.");
    } finally {
      setIslemde(null);
    }
  }

  async function reklamIzle() {
    setReklamIslemde(true);
    try {
      const sonuc = await reklamGoster();
      if (sonuc === "hata") {
        uyari("Reklam yüklenemedi", "Birazdan tekrar dene.");
        return;
      }
      if (sonuc === "izlendi") {
        await new Promise((r) => setTimeout(r, 2000));
        await qc.invalidateQueries({ queryKey: ["me"] });
        uyari("Teşekkürler", "Kayıt hakkın eklendi.");
      }
    } finally {
      setReklamIslemde(false);
    }
  }

  const yillikMi = period === "yillik";
  const gunKayit = me.data?.gun_kayit ?? 0;
  const gunlukLimit = me.data?.gunluk_limit ?? gunlukEnerji;
  const limiteYakin = !mevcutPro && gunKayit >= gunlukLimit;

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <View style={{ alignItems: "center", gap: SP.sm }}>
        <PlanRozeti ben={me.data} />
        {mevcutPro && (
          <Text style={{ color: renk.aksan, fontSize: 13, fontWeight: "700" }}>Pro üyesin 🎉</Text>
        )}
        {!mevcutPro && me.data && (
          <Text style={{ color: renk.textMuted, fontSize: 13, textAlign: "center" }}>
            Bugün {gunKayit}/{gunlukLimit} kayıt hakkını kullandın.
          </Text>
        )}
        {limiteYakin && reklamAktif() && (
          <Pressable onPress={reklamIzle} disabled={reklamIslemde} style={s.reklamBtn}>
            {reklamIslemde ? (
              <ActivityIndicator color={renk.aksan} />
            ) : (
              <>
                <Ionicons name="play-circle-outline" size={16} color={renk.aksan} />
                <Text style={{ color: renk.aksan, fontSize: 13, fontWeight: "700" }}>
                  Reklam izleyerek kayıt hakkı kazan
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {!mevcutPro && (
        <>
          <Sekmeli
            secenekler={["aylik", "yillik"] as const}
            etiket={(x) => (x === "aylik" ? "Aylık" : "Yıllık · %33 indirim")}
            secili={period}
            onSec={setPeriod}
          />

          {yukleniyor ? (
            <YuklemeHalkasi boyut={64} yazi="Paketler alınıyor" />
          ) : (
            <PlanKart
              paket={aktifPaket()}
              yillikMi={yillikMi}
              islemde={islemde}
              onSec={sec}
            />
          )}
        </>
      )}

      <Kart>
        <View style={s.tablo}>
          <View style={s.satir}>
            <Text style={[s.hucreAd, { color: renk.textFaint }]} />
            <Text style={[s.hucreBaslik, { color: renk.textMuted }]}>Free</Text>
            <Text style={[s.hucreBaslik, { color: renk.aksan }]}>Pro</Text>
          </View>
          {OZELLIKLER.map((o) => (
            <View key={o.ad} style={s.satir}>
              <Text style={[s.hucreAd, { color: renk.text }]}>{o.ad}</Text>
              <Isaret var={o.free} renk={renk} />
              <Isaret var={o.pro} renk={renk} />
            </View>
          ))}
        </View>
      </Kart>

      {satinalmaAktif() && (
        <Pressable onPress={geriYukleBas} disabled={!!islemde} style={{ alignSelf: "center" }}>
          <Text style={{ color: renk.aksan, fontSize: 13, fontWeight: "700" }}>
            Satın Alımları Geri Yükle
          </Text>
        </Pressable>
      )}

      <Text style={s.kucukYazi}>
        Ödeme, onaylandığında mağaza hesabına yansır. Abonelik dönem sonunda otomatik yenilenir;
        yenilemeyi kapatmak için en az 24 saat önce mağaza hesabı ayarlarından iptal et.{" "}
        <Text style={{ color: renk.aksan }} onPress={() => router.push("/yasal?belge=kosullar")}>
          Kullanım Koşulları
        </Text>{" "}
        ·{" "}
        <Text style={{ color: renk.aksan }} onPress={() => router.push("/yasal?belge=gizlilik")}>
          Gizlilik
        </Text>
      </Text>
    </ScrollView>
  );
}

function PlanKart({
  paket,
  yillikMi,
  islemde,
  onSec,
}: {
  paket: Paket;
  yillikMi: boolean;
  islemde: string | null;
  onSec: () => void;
}) {
  const renk = useRenkler();
  const busy = islemde === paket.id;

  return (
    <View style={[s.plan, { backgroundColor: renk.card, borderColor: renk.aksan }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: renk.text, fontSize: 17, fontWeight: "800" }}>Pro</Text>
          <View style={[s.rozet, { backgroundColor: renk.aksanSoft }]}>
            <Text style={{ color: renk.aksan, fontSize: 10.5, fontWeight: "800" }}>ÖNERİLEN</Text>
          </View>
        </View>
        <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 2 }}>
          Sınırsız kayıt + hane paylaşımı, reklamsız
        </Text>
        <Text style={{ color: renk.text, fontSize: 20, fontWeight: "800", marginTop: 8 }}>
          {paket.fiyat}
          <Text style={{ color: renk.textFaint, fontSize: 13, fontWeight: "600" }}>
            {yillikMi ? " / yıl" : " / ay"}
          </Text>
        </Text>
      </View>

      <Pressable
        onPress={onSec}
        disabled={!!islemde}
        style={[s.secBtn, { backgroundColor: renk.aksan }, !!islemde && { opacity: 0.5 }]}
      >
        {busy ? (
          <ActivityIndicator color={renk.aksanUstu} />
        ) : (
          <Text style={{ color: renk.aksanUstu, fontWeight: "800", fontSize: 14 }}>Seç</Text>
        )}
      </Pressable>
    </View>
  );
}

function Isaret({ var: v, renk }: { var: Hucre; renk: ReturnType<typeof useRenkler> }) {
  if (typeof v === "string") {
    return (
      <View style={s.hucre}>
        <Text style={{ color: renk.text, fontSize: 11, fontWeight: "700", textAlign: "center" }}>
          {v}
        </Text>
      </View>
    );
  }
  return (
    <View style={s.hucre}>
      <Ionicons
        name={v ? "checkmark-circle" : "remove"}
        size={18}
        color={v ? renk.success : renk.textFaint}
      />
    </View>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.lg, paddingBottom: 60 },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    borderWidth: 1.5,
    borderRadius: R.lg,
    padding: SP.lg,
  },
  rozet: { borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2 },
  secBtn: { borderRadius: R.pill, paddingHorizontal: 22, paddingVertical: 10, minWidth: 76, alignItems: "center" },
  reklamBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  tablo: { gap: 2 },
  satir: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  hucreAd: { flex: 1, fontSize: 13.5, fontWeight: "500" },
  hucreBaslik: { width: 78, textAlign: "center", fontSize: 13, fontWeight: "800" },
  hucre: { width: 78, alignItems: "center", paddingHorizontal: 2 },
  kucukYazi: { color: "#8F8B80", fontSize: 11, lineHeight: 16, textAlign: "center" },
});
