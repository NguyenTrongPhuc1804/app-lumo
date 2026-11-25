import "@formatjs/intl-pluralrules/polyfill.js";
import "@formatjs/intl-pluralrules/locale-data/vi.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";
import "@formatjs/intl-pluralrules/locale-data/zh.js";
import "@formatjs/intl-pluralrules/locale-data/ko.js";
import "@formatjs/intl-pluralrules/locale-data/ja.js";
import "@formatjs/intl-pluralrules/locale-data/fr.js";
import { createInstance } from "i18next";
import { INTERFACE_LANGUAGES, type InterfaceLanguage } from "./interface-language";
import vi from "../locales/vi.json";
import en from "../locales/en.json";
import zh from "../locales/zh.json";
import ko from "../locales/ko.json";
import ja from "../locales/ja.json";
import fr from "../locales/fr.json";

export function createAppI18n(language: InterfaceLanguage) {
  const i18n = createInstance();
  void i18n.init({
    lng: language,
    fallbackLng: "en",
    supportedLngs: Object.keys(INTERFACE_LANGUAGES),
    initAsync: false,
    interpolation: { escapeValue: false },
    resources: {
      vi: { translation: vi },
      en: { translation: en },
      zh: { translation: zh },
      ko: { translation: ko },
      ja: { translation: ja },
      fr: { translation: fr },
    },
  });
  return i18n;
}
