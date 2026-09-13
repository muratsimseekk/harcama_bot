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

export type UyariGoster = (baslik: string, mesaj?: string, butonlar?: UyariButon[]) => void;

type Icerik = { baslik: string; mesaj?: string; butonlar: UyariButon[] };

const Ctx = createContext<UyariGoster>(() => {});

export function useUyari(): UyariGoster {
  return useContext(Ctx);
}

export function UyariProvider({ children }: { children: React.ReactNode }) {
  const [icerik, setIcerik] = useState<Icerik | null>(null);

  const goster = useCallback<UyariGoster>((baslik, mesaj, butonlar) => {
    setIcerik({
      baslik,
      mesaj,
      butonlar: butonlar?.length ? butonlar : [{ yazi: "Tamam" }],
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
        style={[s.kutu, { backgroundColor: renk.card, borderColor: renk.hairline }, golge(3)]}
        onPress={() => {}}
      >
        <Text style={[T.heading, { color: renk.text }]}>{icerik.baslik}</Text>
        {!!icerik.mesaj && (
          <Text style={[T.body, { color: renk.textMuted, lineHeight: 21 }]}>{icerik.mesaj}</Text>
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
  butonlar: { marginTop: SP.md, gap: SP.sm },
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
