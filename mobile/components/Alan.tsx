import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";

export function Alan({
  etiket,
  sifre = false,
  sag,
  style,
  ...rest
}: TextInputProps & { etiket?: string; sifre?: boolean; sag?: React.ReactNode }) {
  const renk = useRenkler();
  const [gizli, setGizli] = useState(sifre);

  return (
    <View style={{ gap: SP.sm }}>
      {etiket && <Text style={[T.label, { color: renk.text }]}>{etiket}</Text>}
      <View style={[s.kutu, { backgroundColor: renk.aksanSoft }]}>
        <TextInput
          style={[s.input, { color: renk.text, fontFamily: FONT["500"] }, style]}
          placeholderTextColor={renk.textFaint}
          secureTextEntry={gizli}
          autoCapitalize={sifre ? "none" : rest.autoCapitalize}
          {...rest}
        />
        {sifre ? (
          <Pressable onPress={() => setGizli((g) => !g)} hitSlop={10}>
            <Ionicons name={gizli ? "eye-off-outline" : "eye-outline"} size={20} color={renk.textMuted} />
          </Pressable>
        ) : (
          sag
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  kutu: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: R.md,
    paddingHorizontal: SP.lg,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 15.5, paddingVertical: 12 },
});
