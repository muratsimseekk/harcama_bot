import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface P {
  children: React.ReactNode;
}
interface S {
  hata: Error | null;
}

/** Render sırasında çökme olursa beyaz ekran yerine hata metnini gösterir. */
export class HataSiniri extends React.Component<P, S> {
  state: S = { hata: null };

  static getDerivedStateFromError(hata: Error): S {
    return { hata };
  }

  componentDidCatch(hata: Error, info: React.ErrorInfo) {
    console.error("HataSiniri:", hata, info.componentStack);
  }

  render() {
    if (this.state.hata) {
      return (
        <ScrollView style={s.kap} contentContainerStyle={s.icerik}>
          <Text style={s.baslik}>Bir şeyler ters gitti</Text>
          <Text style={s.mesaj}>{this.state.hata.message}</Text>
          <Text style={s.stack}>{this.state.hata.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  kap: { flex: 1, backgroundColor: "#0C2A28" },
  icerik: { padding: 24, paddingTop: 80, gap: 12 },
  baslik: { color: "#E97460", fontSize: 20, fontWeight: "700" },
  mesaj: { color: "#E7F3EF", fontSize: 14 },
  stack: { color: "#7B9A93", fontSize: 11, fontFamily: "monospace" },
});
