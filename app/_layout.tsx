import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppearanceStore } from "../stores/appearanceStore";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useAppSync } from "../hooks/useAppSync";
import { useTheme } from "../hooks/useTheme";

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

  if (!fontsLoaded || !configReady || !appearanceReady || !authReady) return null;

  return (
    <SafeAreaProvider>
      <AppNavigation />
    </SafeAreaProvider>
  );
}

function AppNavigation() {
  const { BACKGROUND } = useTheme();
  const colorMode = useAppearanceStore((s) => s.colorMode);
  const token = useAuthStore((s) => s.token);
  const segments = useSegments();
  // Dong bo cau hinh native, tai danh sach model va trang thai quyen
  useAppSync();

  // Chua dang nhap thi vao thang man dang nhap. Man /auth phai duoc phep
  // chay truoc khi co token, neu khong se lap vong.
  useEffect(() => {
    if (token) return;
    const current = segments.join("/");
    if (current === "login" || current === "auth") return;
    router.replace("/login");
  }, [token, segments]);

  return (
    <>
        <StatusBar barStyle={colorMode === "dark" ? "light-content" : "dark-content"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: BACKGROUND, paddingTop: TOP },
          }}
        />
    </>
  );
}
