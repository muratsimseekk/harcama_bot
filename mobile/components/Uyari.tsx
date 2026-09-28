import Ionicons from "@expo/vector-icons/Ionicons";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";

/**
 * Uygulama temalı uyarı/onay penceresi — `Alert.alert` yerine.
 *
 * Neden: RN'in `Alert.alert`'i işletim sisteminin native dialog'unu açar
 * (Android'de Material, iOS'ta sistem uyarısı). Rengi, fontu, köşe yarıçapı
 * değiştirilemez; sıcak krem + mercan + serif olan uygulamanın içinde yabancı
 * duruyor. Bu bileşen aynı API'yi taşır ama tamamen tema içinde kalır.
 *
 * Kullanım:
 *   const uyari = useUyari();
 *   uyari("Kaydedilemedi", "Tekrar dene.");
 *   uyari("Haneyi Sil", "Üyeler çıkarılacak.", [
 *     { yazi: "Vazgeç", stil: "vazgec" },
 *     { yazi: "Sil", stil: "tehlike", onPress: sil },
 *   ]);
 */

export type UyariButon = {
  yazi: string;
  onPress?: () => void;
  /** normal = mercan dolu · vazgec = çerçeveli soluk · tehlike = kırmızı dolu */
  stil?: "normal" | "vazgec" | "tehlike";
};

export type UyariSecenek = { ikon?: keyof typeof Ionicons.glyphMap };

export type UyariGoster = (
  baslik: string,
  mesaj?: string,
  butonlar?: UyariButon[],
  secenek?: UyariSecenek,
) => void;

type Icerik = { baslik: string; mesaj?: string; butonlar: UyariButon[]; ikon?: UyariSecenek["ikon"] };

const Ctx = createContext<UyariGoster>(() => {});

export function useUyari(): UyariGoster {
  return useContext(Ctx);
}

export function UyariProvider({ children }: { children: React.ReactNode }) {
  const [icerik, setIcerik] = useState<Icerik | null>(null);

  const goster = useCallback<UyariGoster>((baslik, mesaj, butonlar, secenek) => {
    setIcerik({
      baslik,
      mesaj,
      butonlar: butonlar?.length ? butonlar : [{ yazi: "Tamam" }],
      ikon: secenek?.ikon,
    });
  }, []);

  return (
    <Ctx.Provider value={goster}>
      <View style={s.kok}>
        {children}
        {icerik && <UyariPenceresi icerik={icerik} onKapat={() => setIcerik(null)} />}
      </View>
    </Ctx.Provider>
  );
}

function UyariPenceresi({ icerik, onKapat }: { icerik: Icerik; onKapat: () => void }) {
  const renk = useRenkler();

  // Android donanım geri tuşu — RN Modal'ın onRequestClose'unun yerini tutar.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onKapat();
      return true;
    });
    return () => sub.remove();
  }, [onKapat]);

  const bas = (b: UyariButon) => {
    onKapat();
    b.onPress?.();
  };

  const butonlar = icerik.butonlar;
  // 2 buton yan yana; 1 ya da 3+ alt alta (uzun etiketler sıkışmasın)
  const yatay = butonlar.length === 2;

  return (
    <Pressable style={s.arka} onPress={onKapat}>
      <Pressable
        style={[
          s.kutu,
          { backgroundColor: renk.card, borderColor: renk.hairline },
          golge(3),
          !!icerik.ikon && s.kutuBuyuk,
        ]}
        onPress={() => {}}
      >
        {!!icerik.ikon && (
          <View style={[s.ikonKutu, { backgroundColor: renk.aksanSoft }]}>
            <Ionicons name={icerik.ikon} size={30} color={renk.aksan} />
          </View>
        )}
        <Text
          style={[
            icerik.ikon ? T.title : T.heading,
            { color: renk.text, textAlign: icerik.ikon ? "center" : "left" },
          ]}
        >
          {icerik.baslik}
        </Text>
        {!!icerik.mesaj && (
          <Text
            style={[
              T.body,
              { color: renk.textMuted, lineHeight: 21 },
              !!icerik.ikon && { textAlign: "center" },
            ]}
          >
            {icerik.mesaj}
          </Text>
        )}

        <View style={[s.butonlar, yatay ? s.yatay : s.dikey]}>
          {butonlar.map((b, i) => {
            const tehlike = b.stil === "tehlike";
            const vazgec = b.stil === "vazgec";
            return (
              <Pressable
                key={`${b.yazi}-${i}`}
                onPress={() => bas(b)}
                style={({ pressed }) => [
                  s.buton,
                  yatay && { flex: 1 },
                  vazgec
                    ? { borderWidth: 1, borderColor: renk.border }
                    : { backgroundColor: tehlike ? renk.danger : renk.aksan },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text
                  style={{
                    color: vazgec ? renk.textMuted : renk.aksanUstu,
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  {b.yazi}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  // RN Modal DEĞİL, mutlak konumlu katman. Modal kullanınca iOS'ta native modal
  // olarak sunulan ekranların (islem-form, confirm) üstüne ikinci bir modal
  // sunulamıyor; sunum sessizce başarısız olup dokunmaları kilitliyordu.
  arka: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: SP.xl,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  kutu: {
    width: "100%",
    maxWidth: 360,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.lg,
    padding: SP.xl,
    gap: SP.sm,
  },
  kutuBuyuk: {
    maxWidth: 400,
    padding: SP.xl + 4,
    gap: SP.md,
    alignItems: "center",
  },
  ikonKutu: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  butonlar: { marginTop: SP.md, gap: SP.sm, alignSelf: "stretch" },
  yatay: { flexDirection: "row" },
  dikey: { flexDirection: "column" },
  buton: {
    borderRadius: R.md,
    paddingVertical: 13,
    paddingHorizontal: SP.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
