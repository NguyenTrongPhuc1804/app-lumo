import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppearanceStore } from "../stores/appearanceStore";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useAppSync } from "../hooks/useAppSync";
import { useTheme } from "../hooks/useTheme";
import { useLanguageStore } from "../stores/languageStore";
import { useLayoutEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { createAppI18n } from "../lib/i18n";
import { useInterfaceLanguage } from "../hooks/useInterfaceLanguage";

export const unstable_settings = { initialRouteName: "(tabs)" };

// padding tren de khong bi thanh trang thai che
const TOP = StatusBar.currentHeight ?? 0;

export default function RootLayout() {
  // Cho font san sang truoc khi ve giao dien de chu khong bi doi kieu
  const [fontsLoaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, MaterialSymbolsOutlined: require("../assets/MaterialSymbolsOutlined.ttf") });
  // Cho doc xong du lieu da luu de khong hien nham che do sang roi doi sang toi
  const configReady = useConfigStore((s) => s.hydrated);
  const appearanceReady = useAppearanceStore((s) => s.hydrated);
  // Cho biet da co token hay chua, de khong nhay vao tab roi bat dang nhap
  const authReady = useAuthStore((s) => s.hydrated);

  const languageReady = useLanguageStore((s) => s.hydrated);
  if (!fontsLoaded || !configReady || !appearanceReady || !authReady || !languageReady) return null;

  return (
    <SafeAreaProvider>
      <AppNavigation />
    </SafeAreaProvider>
  );
}

function AppNavigation() {
  const { BACKGROUND } = useTheme();
  const colorMode = useAppearanceStore((s) => s.colorMode);
  const language = useInterfaceLanguage();
  const [i18n] = useState(() => createAppI18n(language));

  useLayoutEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [i18n, language]);

  // Khách được vào Trang chủ; hành động cần tài khoản tự mở màn đăng nhập.
  useAppSync();

  return (
    <I18nextProvider i18n={i18n}>
        <StatusBar barStyle={colorMode === "dark" ? "light-content" : "dark-content"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: BACKGROUND, paddingTop: TOP },
          }}
        />
    </I18nextProvider>
  );
}
