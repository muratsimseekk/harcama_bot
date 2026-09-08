import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Alan } from "@/components/Alan";
import { Kart, Yukleniyor } from "@/components/base";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  useHane,
  useHaneAd,
  useHaneKatil,
  useHaneKod,
  useHaneOlustur,
  useHaneSil,
  useHaneUyeCikar,
  useHaneUyeRol,
} from "@/lib/queries";
import { useMe } from "@/lib/queries";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";
import type { HaneRol } from "@/lib/types";

const ROL_ETIKET: Record<HaneRol, string> = {
  owner: "Kurucu",
  editor: "Düzenleyici",
  viewer: "Görüntüleyici",
};
const ROL_SIRA: HaneRol[] = ["viewer", "editor"];

function hataMesaji(e: unknown): string {
  return e instanceof ApiError ? e.message : "Bir şeyler ters gitti.";
}

export default function HaneEkrani() {
  const renk = useRenkler();
  const { session } = useAuth();
  const hane = useHane();
  const me = useMe();

  const uyeAdi =
    (session?.user?.user_metadata?.ad as string | undefined)?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Üye";
  const pro = me.data?.plan === "pro";

  if (hane.isLoading) return <Yukleniyor yukseklik={200} />;

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      {hane.data ? (
        <Hanede hane={hane.data} uyeAdi={uyeAdi} />
      ) : (
        <Hanesiz pro={pro} uyeAdi={uyeAdi} />
      )}
    </ScrollView>
  );
}

/* ---------------- hanede değil ---------------- */

function Hanesiz({ pro, uyeAdi }: { pro: boolean; uyeAdi: string }) {
  const renk = useRenkler();
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [kod, setKod] = useState("");
  const olustur = useHaneOlustur();
  const katil = useHaneKatil();

  return (
    <>
      <Kart>
        <Text style={[T.heading, { color: renk.text }]}>Hane Oluştur</Text>
        <Text style={{ color: renk.textMuted, fontSize: 13, marginTop: 4, marginBottom: SP.md }}>
          Aile üyeleri bir kodla katılır; harcamalar tek yerde birleşir.
        </Text>
        {pro ? (
          <>
            <Alan
              etiket="Hane adı"
              value={ad}
              onChangeText={setAd}
              placeholder="ör. Evimiz"
              maxLength={40}
            />
            <View style={{ height: SP.md }} />
            <Buton
              yazi="Oluştur"
              yukleniyor={olustur.isPending}
              onPress={() =>
                ad.trim() &&
                olustur.mutate(
                  { ad: ad.trim(), uyeAdi },
                  { onError: (e) => Alert.alert("Oluşturulamadı", hataMesaji(e)) },
                )
              }
            />
          </>
        ) : (
          <>
            <View style={[s.proKutu, { backgroundColor: renk.aksanSoft }]}>
              <Ionicons name="lock-closed" size={16} color={renk.aksan} />
              <Text style={{ color: renk.aksan, fontSize: 13, flex: 1, fontWeight: "600" }}>
                Hane oluşturmak Pro üyelik gerektirir. Bir haneye katılmak ücretsiz.
              </Text>
            </View>
            <View style={{ height: SP.sm }} />
            <Buton yazi="Pro'ya Geç" onPress={() => router.push("/uyelik")} />
          </>
        )}
      </Kart>

      <Kart>
        <Text style={[T.heading, { color: renk.text }]}>Bir Haneye Katıl</Text>
        <Text style={{ color: renk.textMuted, fontSize: 13, marginTop: 4, marginBottom: SP.md }}>
          Hane kurucusundan aldığın 6 haneli kodu gir.
        </Text>
        <Alan
          etiket="Katılım kodu"
          value={kod}
          onChangeText={(v) => setKod(v.toUpperCase())}
          placeholder="ABC234"
          autoCapitalize="characters"
          maxLength={8}
        />
        <View style={{ height: SP.md }} />
        <Buton
          yazi="Katıl"
          varyant="ikincil"
          yukleniyor={katil.isPending}
          onPress={() =>
            kod.trim().length >= 4 &&
            katil.mutate(
              { kod: kod.trim(), uyeAdi },
              { onError: (e) => Alert.alert("Katılınamadı", hataMesaji(e)) },
            )
          }
        />
      </Kart>
    </>
  );
}

/* ---------------- hanede ---------------- */

function Hanede({
  hane,
  uyeAdi: _uyeAdi,
}: {
  hane: NonNullable<ReturnType<typeof useHane>["data"]>;
  uyeAdi: string;
}) {
  const renk = useRenkler();
  const adM = useHaneAd();
  const kodM = useHaneKod();
  const rolM = useHaneUyeRol();
  const cikarM = useHaneUyeCikar();
  const silM = useHaneSil();
  const [adDuzenle, setAdDuzenle] = useState(false);
  const [yeniAd, setYeniAd] = useState(hane.ad);

  const kodKopyala = async () => {
    await Clipboard.setStringAsync(hane.kod);
    Alert.alert("Kopyalandı", `Katılım kodu: ${hane.kod}`);
  };

  const ayril = () => {
    const ben = hane.uyeler.find((u) => u.ben);
    Alert.alert("Haneden Ayrıl", "Kendi harcamaların artık paylaşılmayacak.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Ayrıl",
        style: "destructive",
        onPress: () => ben && cikarM.mutate(ben.user_id, { onError: (e) => Alert.alert("Hata", hataMesaji(e)) }),
      },
    ]);
  };

  const sil = () =>
    Alert.alert("Haneyi Sil", "Hane silinecek, üyeler çıkarılacak. Kayıtlar silinmez.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => silM.mutate(undefined, { onError: (e) => Alert.alert("Hata", hataMesaji(e)) }) },
    ]);

  return (
    <>
      <Kart>
        {adDuzenle && hane.owner ? (
          <>
            <Alan etiket="Hane adı" value={yeniAd} onChangeText={setYeniAd} maxLength={40} />
            <View style={{ height: SP.sm }} />
            <View style={{ flexDirection: "row", gap: SP.sm }}>
              <View style={{ flex: 1 }}>
                <Buton
                  yazi="Kaydet"
                  yukleniyor={adM.isPending}
                  onPress={() =>
                    adM.mutate(yeniAd.trim(), { onSuccess: () => setAdDuzenle(false) })
                  }
                />
              </View>
              <Buton yazi="Vazgeç" varyant="hayalet" onPress={() => setAdDuzenle(false)} />
            </View>
          </>
        ) : (
          <Pressable
            onPress={() => hane.owner && setAdDuzenle(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}
          >
            <Ionicons name="people" size={22} color={renk.aksan} />
            <Text style={[T.title, { color: renk.text, flex: 1 }]}>{hane.ad}</Text>
            {hane.owner && <Ionicons name="pencil" size={16} color={renk.textFaint} />}
          </Pressable>
        )}
        <Text style={{ color: renk.textMuted, fontSize: 13, marginTop: 4 }}>
          {hane.uyeler.length} kişi · ortak harcama görünümü
        </Text>
      </Kart>

      <Kart>
        <Text style={[T.label, { color: renk.textMuted }]}>Katılım kodu</Text>
        <View style={s.kodSatir}>
          <Text style={[s.kod, { color: renk.text }]}>{hane.kod}</Text>
          <Pressable onPress={kodKopyala} style={[s.kodBtn, { backgroundColor: renk.aksan }]}>
            <Ionicons name="copy-outline" size={16} color={renk.aksanUstu} />
            <Text style={{ color: renk.aksanUstu, fontWeight: "700", fontSize: 13 }}>Kopyala</Text>
          </Pressable>
        </View>
        {hane.owner && (
          <Pressable
            onPress={() =>
              Alert.alert("Kodu Yenile", "Eski kod geçersiz olur.", [
                { text: "Vazgeç", style: "cancel" },
                { text: "Yenile", onPress: () => kodM.mutate(undefined) },
              ])
            }
            style={{ marginTop: SP.sm }}
          >
            <Text style={{ color: renk.aksan, fontSize: 13, fontWeight: "600" }}>Kodu yenile</Text>
          </Pressable>
        )}
      </Kart>

      <View style={{ gap: SP.sm }}>
        <Text style={[T.overline, { color: renk.textFaint, marginLeft: SP.xs }]}>ÜYELER</Text>
        {hane.uyeler.map((u) => (
          <View key={u.user_id} style={[s.uye, { backgroundColor: renk.card }, golge(1)]}>
            <View style={[s.uyeDaire, { backgroundColor: renk.aksanSoft }]}>
              <Ionicons name="person" size={16} color={renk.aksan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: renk.text, fontWeight: "600", fontSize: 14.5 }}>
                {u.ad}
                {u.ben ? "  (sen)" : ""}
              </Text>
              <Text style={{ color: renk.textFaint, fontSize: 12 }}>{ROL_ETIKET[u.rol]}</Text>
            </View>
            {hane.owner && !u.ben && (
              <View style={{ flexDirection: "row", gap: SP.sm, alignItems: "center" }}>
                <Pressable
                  onPress={() => {
                    const sonraki = ROL_SIRA[(ROL_SIRA.indexOf(u.rol as HaneRol) + 1) % ROL_SIRA.length];
                    rolM.mutate({ uid: u.user_id, rol: sonraki });
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="swap-horizontal" size={18} color={renk.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert("Üyeyi Çıkar", `${u.ad} haneden çıkarılsın mı?`, [
                      { text: "Vazgeç", style: "cancel" },
                      { text: "Çıkar", style: "destructive", onPress: () => cikarM.mutate(u.user_id) },
                    ])
                  }
                  hitSlop={8}
                >
                  <Ionicons name="close-circle-outline" size={19} color={renk.danger} />
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ marginTop: SP.md }}>
        {hane.owner ? (
          <Buton yazi="Haneyi Sil" varyant="hayalet" onPress={sil} />
        ) : (
          <Buton yazi="Haneden Ayrıl" varyant="hayalet" onPress={ayril} />
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.md, paddingBottom: 60 },
  proKutu: { flexDirection: "row", alignItems: "center", gap: SP.sm, padding: SP.md, borderRadius: R.md },
  kodSatir: { flexDirection: "row", alignItems: "center", gap: SP.md, marginTop: 6 },
  kod: { flex: 1, fontSize: 26, fontWeight: "800", letterSpacing: 4 },
  kodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: R.pill,
  },
  uye: { flexDirection: "row", alignItems: "center", gap: SP.md, padding: 12, borderRadius: R.md },
  uyeDaire: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
