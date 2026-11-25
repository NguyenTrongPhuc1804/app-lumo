import { AppState, Platform } from "react-native";
import { useSyncExternalStore } from "react";
import { resolveLanguage } from "../lib/interface-language";
import ScreenTranslator from "../modules/screen-translator";
import { useLanguageStore } from "../stores/languageStore";

function subscribeToDeviceLanguage(onChange: () => void) {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") onChange();
  });
  return () => subscription.remove();
}

function getDeviceLanguage() {
  const tags = Platform.OS === "android" && ScreenTranslator.getDeviceLanguageTags
    ? ScreenTranslator.getDeviceLanguageTags()
    : [Intl.DateTimeFormat().resolvedOptions().locale];
  return resolveLanguage("system", tags);
}

export function useInterfaceLanguage() {
  const preference = useLanguageStore((state) => state.preference);
  const deviceLanguage = useSyncExternalStore(subscribeToDeviceLanguage, getDeviceLanguage, () => "en" as const);
  return preference === "system" ? deviceLanguage : preference;
}
