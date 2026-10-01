import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, View, type ViewStyle } from "react-native";

/**
 * İçeriği klavyenin ÜSTÜNDE tutan kap. KeyboardAvoidingView yerine kullanılır:
 * Android edge-to-edge'de (Expo SDK 57) pencere klavyeyle küçülmüyor, KAV'ın "height"
 * modu da alttaki sekme çubuğunu bilmediği için yazı kutusu klavyenin altında kalıyordu.
 *
 * Yöntem: klavye açılınca kabın ekrandaki alt kenarını ölç; klavyenin üst kenarıyla
 * çakışan kısım kadar alt boşluk ver (sekme çubuğu / sistem çubuğu kendiliğinden düşülür).
 */
export function KlavyeAlani({ style, children }: { style?: ViewStyle; children: React.ReactNode }) {
  const ref = useRef<View>(null);
  const [itme, setItme] = useState(0);

  useEffect(() => {
    const gosterOlay = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const gizleOlay = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const goster = Keyboard.addListener(gosterOlay, (e) => {
      const klavyeUstu = e.endCoordinates.screenY;
      ref.current?.measureInWindow((_x, y, _w, h) => {
        // Kabın alt kenarı klavyenin üst kenarından ne kadar aşağıdaysa o kadar it.
        // (Kap flex:1 olduğundan paddingBottom dış çerçeveyi değiştirmez → ölçüm sabit.)
        setItme(Math.max(0, y + h - klavyeUstu));
      });
    });
    const gizle = Keyboard.addListener(gizleOlay, () => setItme(0));
    return () => {
      goster.remove();
      gizle.remove();
    };
  }, []);

  return (
    <View ref={ref} style={[{ flex: 1 }, style, { paddingBottom: itme }]}>
      {children}
    </View>
  );
}
