import * as Sentry from "@sentry/react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

interface P {
  children: React.ReactNode;
}
interface S {
  hata: Error | null;
}

/** Render sırasında çökme olursa beyaz ekran yerine Türkçe bir hata ekranı gösterir.
 * Teknik ayrıntı (mesaj/stack) yalnız geliştirme build'inde görünür; asıl kayıt Sentry'de. */
export class HataSiniri extends React.Component<P, S> {
  state: S = { hata: null };

  static getDerivedStateFromError(hata: Error): S {
    return { hata };
  }

  componentDidCatch(hata: Error, info: React.ErrorInfo) {
    console.error("HataSiniri:", hata, info.componentStack);
    Sentry.captureException(hata, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hata) {
      return (
        <ScrollView style={s.kap} contentContainerStyle={s.icerik}>
          <Text style={s.baslik}>Bir şeyler ters gitti</Text>
          <Text style={s.mesaj}>
            Beklenmedik bir sorunla karşılaştık ve ekibimize bildirdik. Tekrar denemek için
            aşağıdaki düğmeye dokun.
          </Text>
          <Pressable style={s.buton} onPress={() => this.setState({ hata: null })}>
            <Text style={s.butonYazi}>Tekrar dene</Text>
          </Pressable>
          {__DEV__ && <Text style={s.stack}>{`${this.state.hata.message}

${this.state.hata.stack}`}</Text>}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  kap: { flex: 1, backgroundColor: "#1F1E1D" },
  icerik: { padding: 24, paddingTop: 80, gap: 12 },
  baslik: { color: "#E0866A", fontSize: 20, fontWeight: "700" },
  mesaj: { color: "#E8E6DC", fontSize: 14 },
  buton: {
    alignSelf: "flex-start",
    backgroundColor: "#D97757",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 8,
  },
  butonYazi: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  stack: { color: "#8F8B80", fontSize: 11, fontFamily: "monospace" },
});
