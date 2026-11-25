import { Text } from "react-native";
import Svg, { Path } from "react-native-svg";
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

// Font đóng gói không chứa các glyph này.
const APPEARANCE_PATHS = {
  light_mode: "M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM3.5 5l1.4-1.4 2.1 2.1L5.6 7zm13.5 13 1.4-1.4 2.1 2.1-1.4 1.4zM17 5.7l2.1-2.1L20.5 5l-2.1 2.1zM3.5 19l2.1-2.1L7 18.3l-2.1 2.1z",
  dark_mode: "M10 2a10 10 0 1 0 12 12A8.5 8.5 0 0 1 10 2Zm-2.9 3.6A10.5 10.5 0 0 0 18.4 17 8 8 0 1 1 7.1 5.6Z",
  format_size: "M3 4h18v2H13v14h-2V6H3zm0 8h6v2H7v6H5v-6H3z",
  text_fields: "M11 3h2l7 18h-2.5l-1.8-5H8.3l-1.8 5H4L11 3Zm-2 11h6l-3-8Z",
} as const;

export type StitchIconName = keyof typeof ICONS | keyof typeof APPEARANCE_PATHS;

export default function StitchIcon({ name, size = 24, color = TEXT }: { name: StitchIconName; size?: number; color?: string }) {
  if (!(name in ICONS)) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no">
        <Path d={APPEARANCE_PATHS[name as keyof typeof APPEARANCE_PATHS]} fill={color} fillRule="evenodd" />
      </Svg>
    );
  }
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      allowFontScaling={false}
      style={{ fontFamily: "MaterialSymbolsOutlined", fontSize: size, lineHeight: size, width: size, height: size, color, includeFontPadding: false, textAlign: "center" }}
    >
      {ICONS[name as keyof typeof ICONS]}
    </Text>
  );
}
