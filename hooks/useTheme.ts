import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { getTextScale } from "../lib/appearance-options";
import { createTheme } from "../lib/theme";
import { useAppearanceStore } from "../stores/appearanceStore";

// Gom màu, style và cỡ chữ thành một object theme.
// Tính lại khi đổi sáng/tối, cỡ chữ hoặc chiều rộng màn hình.
export function useTheme() {
  const colorMode = useAppearanceStore((s) => s.colorMode);
  const textSize = useAppearanceStore((s) => s.textSize);
  const { width } = useWindowDimensions();

  return useMemo(
    () => createTheme(colorMode === "dark", getTextScale(textSize, width), width),
    [colorMode, textSize, width]
  );
}
