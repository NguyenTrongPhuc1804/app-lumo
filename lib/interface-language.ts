export const INTERFACE_LANGUAGES = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "简体中文",
  ko: "한국어",
  ja: "日本語",
  fr: "Français",
} as const;

export type InterfaceLanguage = keyof typeof INTERFACE_LANGUAGES;
export type LanguagePreference = "system" | InterfaceLanguage;

export function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(INTERFACE_LANGUAGES, value);
}

export function resolveLanguage(preference: LanguagePreference, deviceTags: readonly string[]): InterfaceLanguage {
  if (isInterfaceLanguage(preference)) return preference;
  for (const tag of deviceTags) {
    const code = tag.toLowerCase().split(/[-_]/)[0];
    if (isInterfaceLanguage(code)) return code;
  }
  return "en";
}
