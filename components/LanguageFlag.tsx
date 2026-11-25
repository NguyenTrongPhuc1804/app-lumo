import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { InterfaceLanguage } from "../lib/interface-language";

const star = "M0 -3L.7 -1H2.85L1.1 .35L1.8 2.5L0 1.2L-1.8 2.5L-1.1 .35L-2.85 -1H-.7Z";

// Cờ chỉ minh họa; chip vẫn hiển thị và đọc tên ngôn ngữ.
const flags = {
  vi: <><Rect width={24} height={16} fill="#DA251D" /><Path d={star} transform="translate(12 8) scale(1.5)" fill="#FF0" /></>,
  en: <>
    <Rect width={24} height={16} fill="#012169" />
    <Path d="M0 0L24 16M24 0L0 16" stroke="#FFF" strokeWidth={3} />
    <Path d="M0 0L24 16M24 0L0 16" stroke="#C8102E" strokeWidth={1} />
    <Path d="M12 0V16M0 8H24" stroke="#FFF" strokeWidth={5} />
    <Path d="M12 0V16M0 8H24" stroke="#C8102E" strokeWidth={3} />
  </>,
  zh: <>
    <Rect width={24} height={16} fill="#DE2910" />
    <Path d={star} transform="translate(5 5) scale(.8)" fill="#FFDE00" />
    <Path d={star} transform="translate(8.5 2) rotate(-35) scale(.28)" fill="#FFDE00" />
    <Path d={star} transform="translate(10.4 3.6) rotate(-55) scale(.28)" fill="#FFDE00" />
    <Path d={star} transform="translate(10.4 6) rotate(-80) scale(.28)" fill="#FFDE00" />
    <Path d={star} transform="translate(8.5 7.8) rotate(-115) scale(.28)" fill="#FFDE00" />
  </>,
  ko: <>
    <Rect width={24} height={16} fill="#FFF" />
    <Circle cx={12} cy={8} r={3.7} fill="#0047A0" />
    <Path d="M8.3 8a3.7 3.7 0 0 1 7.4 0 1.85 1.85 0 0 0-3.7 0 1.85 1.85 0 0 1-3.7 0" transform="rotate(32 12 8)" fill="#CD2E3A" />
    <Path d="M3 4.8L6 1.8M3.7 5.5L6.7 2.5M4.4 6.2L7.4 3.2M16.6 12.8l1.2-1.2m.6-.6 1.2-1.2m-2.3 3.7 1.2-1.2m.6-.6 1.2-1.2m-2.3 3.7 1.2-1.2m.6-.6 1.2-1.2M16.6 3.2l1.2 1.2m.6.6 1.2 1.2m-2.3-3.7 3 3m-2.3-3.7 1.2 1.2m.6.6 1.2 1.2M3 11.2l3 3m-2.3-3.7 1.2 1.2m.6.6 1.2 1.2m-2.3-3.7 3 3" stroke="#111" strokeWidth={0.65} />
  </>,
  ja: <><Rect width={24} height={16} fill="#FFF" /><Circle cx={12} cy={8} r={4.7} fill="#BC002D" /></>,
  fr: <><Rect width={24} height={16} fill="#FFF" /><Rect width={8} height={16} fill="#0055A4" /><Rect x={16} width={8} height={16} fill="#EF4135" /></>,
};

export default function LanguageFlag({ language }: { language: InterfaceLanguage }) {
  return (
    <Svg width={21} height={14} viewBox="0 0 24 16" accessible={false} importantForAccessibility="no">
      {flags[language]}
      <Rect x={0.5} y={0.5} width={23} height={15} stroke="#000" strokeOpacity={0.16} fill="none" />
    </Svg>
  );
}
