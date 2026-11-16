import { View } from "react-native";

// Font Material Symbols da duoc sub-set san, khong co glyph nguoi dung.
// Ve bang View de khong phai tai them font hay them thu vien icon.
export default function PersonGlyph({ size = 24, color = "#0F172A" }: { size?: number; color?: string }) {
  const head = size * 0.34;
  const bodyWidth = size * 0.62;
  const bodyHeight = size * 0.32;

  return (
    <View accessible={false} importantForAccessibility="no" style={{ width: size, height: size, alignItems: "center", justifyContent: "center", gap: size * 0.08 }}>
      <View style={{ width: head, height: head, borderRadius: head / 2, backgroundColor: color }} />
      <View style={{ width: bodyWidth, height: bodyHeight, borderTopLeftRadius: bodyWidth / 2, borderTopRightRadius: bodyWidth / 2, backgroundColor: color }} />
    </View>
  );
}
