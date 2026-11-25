// ML Kit on-device translation: developers.google.com/ml-kit/language/translation/translation-language-support
const englishNames: Record<string, string> = {
  af: "Afrikaans", ar: "Arabic", be: "Belarusian", bg: "Bulgarian", bn: "Bengali",
  ca: "Catalan", cs: "Czech", cy: "Welsh", da: "Danish", de: "German", el: "Greek",
  en: "English", eo: "Esperanto", es: "Spanish", et: "Estonian", fa: "Persian",
  fi: "Finnish", fr: "French", ga: "Irish", gl: "Galician", gu: "Gujarati", he: "Hebrew",
  hi: "Hindi", hr: "Croatian", ht: "Haitian Creole", hu: "Hungarian", id: "Indonesian",
  is: "Icelandic", it: "Italian", ja: "Japanese", ka: "Georgian", kn: "Kannada",
  ko: "Korean", lt: "Lithuanian", lv: "Latvian", mk: "Macedonian", mr: "Marathi",
  ms: "Malay", mt: "Maltese", nl: "Dutch", no: "Norwegian", pl: "Polish", pt: "Portuguese",
  ro: "Romanian", ru: "Russian", sk: "Slovak", sl: "Slovenian", sq: "Albanian", sv: "Swedish",
  sw: "Swahili", ta: "Tamil", te: "Telugu", th: "Thai", tl: "Tagalog", tr: "Turkish",
  uk: "Ukrainian", ur: "Urdu", vi: "Vietnamese", zh: "Chinese",
};

export const ML_KIT_LANGUAGES = Object.keys(englishNames);
export const OCR_LANGUAGES: readonly string[] = ["en", "zh", "ja", "ko", "vi"];

const displayNames = new Map<string, Intl.DisplayNames>();

export function languageName(code: string, locale?: string) {
  if (!locale || typeof Intl.DisplayNames !== "function") return englishNames[code] ?? code;
  let names = displayNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "language", fallback: "none" });
    displayNames.set(locale, names);
  }
  return englishNames[code] ? names.of(code) ?? englishNames[code] : code;
}

function searchText(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

export function findLanguages(codes: readonly string[], query: string, locale?: string) {
  const term = searchText(query);
  return codes.map(code => ({ code, label: languageName(code, locale) }))
    .filter(({ code, label }) => !term || searchText(label).includes(term) || code.startsWith(term) || searchText(englishNames[code] ?? "").includes(term))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}
