import { Text } from "react-native";
import { TEXT } from "../lib/theme";

// Ma glyph tu font Material Symbols Outlined chinh thuc cua Google.
const ICONS = {
  crop_free: "\ue3c2",
  play_arrow: "\ue037",
  explore: "\ue87a",
  memory: "\ue322",
  tune: "\ue429",
  translate: "\ue8e2",
  sync_alt: "\uea18",
  layers: "\ue53b",
  screen_search_desktop: "\uef70",
  dns: "\ue875",
  key: "\ue73c",
  speed: "\ue9e4",
  sports_esports: "\uea28",
  menu_book: "\uea19",
  refresh: "\ue5d5",
  add: "\ue145",
  edit: "\uf097",
  check: "\ue668",
  delete: "\ue92e",
  expand_more: "\ue5cf",
  chevron_right: "\ue5cc",
  help: "\ue8fd",
  ads_click: "\ue762",
  gesture: "\ue155",
  tab_unselected: "\ue8d9",
} as const;

export type StitchIconName = keyof typeof ICONS;

export default function StitchIcon({ name, size = 24, color = TEXT }: { name: StitchIconName; size?: number; color?: string }) {
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      allowFontScaling={false}
      style={{ fontFamily: "MaterialSymbolsOutlined", fontSize: size, lineHeight: size, width: size, height: size, color, includeFontPadding: false, textAlign: "center" }}
    >
      {ICONS[name]}
    </Text>
  );
}
