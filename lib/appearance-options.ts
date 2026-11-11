export type ColorMode = "light" | "dark";
export type TextSize = "auto" | "tiny" | "small" | "normal" | "large";
export type Appearance = { colorMode: ColorMode; textSize: TextSize };

export function parseAppearance(saved: string | null): Appearance {
  try {
    const data = JSON.parse(saved ?? "{}");
    return { colorMode: data?.colorMode === "dark" ? "dark" : "light", textSize: ["tiny", "small", "normal", "large"].includes(data?.textSize) ? data.textSize : "auto" };
  } catch {
    return { colorMode: "light", textSize: "auto" };
  }
}

export function getTextScale(size: TextSize, width: number): number {
  if (size === "tiny") return 0.8;
  if (size === "small") return 0.9;
  if (size === "large") return 1.15;
  if (size === "normal") return 1;
  return width < 360 ? 0.9 : width < 390 ? 0.95 : 1;
}
