import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Kart, Sekmeli } from "@/components/base";
import { Metin as Text } from "@/components/Metin";
import { PlanRozeti, denemeGunKalan } from "@/components/PlanRozeti";
import { useMe } from "@/lib/queries";
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

type Hucre = boolean | string;
type Period = "aylik" | "yillik";

function ozellikler(baseAiLimit: number): { ad: string; base: Hucre; pro: Hucre }[] {
  return [
    { ad: "Elle işlem ekleme", base: true, pro: true },
    { ad: "Bütçe, hedef, özet & analiz", base: true, pro: true },
    { ad: "AI kayıt (sesli/yazılı)", base: `${baseAiLimit}/ay`, pro: "Sınırsız" },
    { ad: "Hane / aile paylaşımı", base: false, pro: true },
  ];
}

// Mağazadan teklif gelmezse gösterilecek referans (STATIK_FIYAT'tan türetilir)
function statikPaket(plan: "base" | "pro", period: Period): Paket {
  const id = `${plan}_${period}`;
  return { id, plan, period, fiyat: STATIK_FIYAT[id] ?? "", _rc: null };
}

export default function Uyelik() {
  const renk = useRenkler();
  const router = useRouter();
  const me = useMe();
  const deneme = me.data?.ham_plan === "trial" ? denemeGunKalan(me.data.trial_bitis) : null;
  const baseAiLimit = me.data?.base_ai_limit ?? 150;
  const OZELLIKLER = ozellikler(baseAiLimit);
  const mevcutPro = me.data?.plan === "pro";

  const [period, setPeriod] = useState<Period>("yillik");
  const [paketler, setPaketler] = useState<Paket[]>([]);
  const [yukleniyor, setYukleniyor] = useState(satinalmaAktif());
  const [islemde, setIslemde] = useState<string | null>(null);

  useEffect(() => {
    if (!satinalmaAktif()) return;
    teklifler()
      .then(setPaketler)
      .finally(() => setYukleniyor(false));
  }, []);

  const paketBul = useCallback(
    (plan: "base" | "pro"): Paket =>
      paketler.find((p) => p.plan === plan && p.period === period) ?? statikPaket(plan, period),
    [paketler, period],
  );

  async function planaGuncelle(sonuc: EtkinPlan, mesaj: string) {
    if (sonuc) {
      await me.refetch();
      Alert.alert("Tamam", mesaj);
      router.back();
    }
  }

  async function sec(plan: "base" | "pro") {
    if (!satinalmaAktif()) {
      Alert.alert(
        "Abonelikler yakında",
        "Mağaza abonelikleri bir sonraki güncellemede açılacak. " +
          "Şu an tüm özellikler deneme sürende açık.",
      );
      return;
    }
    const paket = paketBul(plan);
    if (!paket._rc) {
      Alert.alert("Hata", "Bu paket şu an mağazada bulunamadı. Daha sonra tekrar dene.");
      return;
    }
    setIslemde(paket.id);
    try {
      const sonuc = await satinAl(paket);
      await planaGuncelle(sonuc, "Üyeliğin güncellendi.");
    } catch (e) {
      Alert.alert("Tamamlanamadı", e instanceof Error ? e.message : "Satın alma başarısız oldu.");
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
      else Alert.alert("Bulunamadı", "Bu hesapta geri yüklenecek aktif abonelik yok.");
    } finally {
      setIslemde(null);
    }
  }

  const yillikMi = period === "yillik";

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <View style={{ alignItems: "center", gap: SP.sm }}>
        <PlanRozeti ben={me.data} />
        {deneme != null && (
          <Text style={{ color: renk.textMuted, fontSize: 13, textAlign: "center" }}>
            Denemene {deneme} gün kaldı. Sonra Base'e geçersin — istediğin an yükseltebilirsin.
          </Text>
        )}
        {mevcutPro && (
          <Text style={{ color: renk.aksan, fontSize: 13, fontWeight: "700" }}>Pro üyesin 🎉</Text>
        )}
      </View>

      <Sekmeli
        secenekler={["aylik", "yillik"] as const}
        etiket={(x) => (x === "aylik" ? "Aylık" : "Yıllık · %33 indirim")}
        secili={period}
        onSec={setPeriod}
      />

      {yukleniyor ? (
        <ActivityIndicator color={renk.aksan} style={{ marginVertical: SP.xl }} />
      ) : (
        <View style={{ gap: SP.md }}>
          <PlanKart
            baslik="Base"
            paket={paketBul("base")}
            yillikMi={yillikMi}
            aciklama="Sınırlı AI, hane yok"
            vurgulu={false}
            mevcut={me.data?.plan === "base" && me.data?.ham_plan === "base"}
            islemde={islemde}
            onSec={() => sec("base")}
          />
          <PlanKart
            baslik="Pro"
            paket={paketBul("pro")}
            yillikMi={yillikMi}
            aciklama="Sınırsız AI + hane paylaşımı"
            vurgulu
            mevcut={mevcutPro}
            islemde={islemde}
            onSec={() => sec("pro")}
          />
        </View>
      )}

      <Kart>
        <View style={s.tablo}>
          <View style={s.satir}>
            <Text style={[s.hucreAd, { color: renk.textFaint }]} />
            <Text style={[s.hucreBaslik, { color: renk.textMuted }]}>Base</Text>
            <Text style={[s.hucreBaslik, { color: renk.aksan }]}>Pro</Text>
          </View>
          {OZELLIKLER.map((o) => (
            <View key={o.ad} style={s.satir}>
              <Text style={[s.hucreAd, { color: renk.text }]}>{o.ad}</Text>
              <Isaret var={o.base} renk={renk} />
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
  baslik,
  paket,
  yillikMi,
  aciklama,
  vurgulu,
  mevcut,
  islemde,
  onSec,
}: {
  baslik: string;
  paket: Paket;
  yillikMi: boolean;
  aciklama: string;
  vurgulu: boolean;
  mevcut: boolean;
  islemde: string | null;
  onSec: () => void;
}) {
  const renk = useRenkler();
  const busy = islemde === paket.id;

  return (
    <View
      style={[
        s.plan,
        { backgroundColor: renk.card, borderColor: vurgulu ? renk.aksan : renk.border },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: renk.text, fontSize: 17, fontWeight: "800" }}>{baslik}</Text>
          {vurgulu && (
            <View style={[s.rozet, { backgroundColor: renk.aksanSoft }]}>
              <Text style={{ color: renk.aksan, fontSize: 10.5, fontWeight: "800" }}>ÖNERİLEN</Text>
            </View>
          )}
        </View>
        <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 2 }}>{aciklama}</Text>
        <Text style={{ color: renk.text, fontSize: 20, fontWeight: "800", marginTop: 8 }}>
          {paket.fiyat}
          <Text style={{ color: renk.textFaint, fontSize: 13, fontWeight: "600" }}>
            {yillikMi ? " / yıl" : " / ay"}
          </Text>
        </Text>
      </View>

      {mevcut ? (
        <Text style={{ color: renk.textFaint, fontSize: 13, fontWeight: "700" }}>Mevcut plan</Text>
      ) : (
        <Pressable
          onPress={onSec}
          disabled={!!islemde}
          style={[
            s.secBtn,
            { backgroundColor: vurgulu ? renk.aksan : renk.aksanSoft },
            !!islemde && { opacity: 0.5 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={vurgulu ? renk.aksanUstu : renk.aksan} />
          ) : (
            <Text
              style={{
                color: vurgulu ? renk.aksanUstu : renk.aksan,
                fontWeight: "800",
                fontSize: 14,
              }}
            >
              Seç
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function Isaret({ var: v, renk }: { var: Hucre; renk: ReturnType<typeof useRenkler> }) {
  if (typeof v === "string") {
    return (
      <View style={s.hucre}>
        <Text style={{ color: renk.text, fontSize: 12, fontWeight: "700", textAlign: "center" }}>
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
  tablo: { gap: 2 },
  satir: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  hucreAd: { flex: 1, fontSize: 13.5, fontWeight: "500" },
  hucreBaslik: { width: 68, textAlign: "center", fontSize: 13, fontWeight: "800" },
  hucre: { width: 68, alignItems: "center" },
  kucukYazi: { color: "#8F8B80", fontSize: 11, lineHeight: 16, textAlign: "center" },
});
