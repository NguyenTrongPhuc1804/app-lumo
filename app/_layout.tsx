import { BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_700Bold, useFonts } from "@expo-google-fonts/be-vietnam-pro";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider } from "../lib/settings";
import { BACKGROUND } from "../lib/theme";

// padding tren de khong bi thanh trang thai che
const TOP = StatusBar.currentHeight ?? 0;

export default function RootLayout() {
  // Cho font san sang truoc khi ve giao dien de chu khong bi doi kieu
  const [fontsLoaded] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_700Bold, MaterialSymbolsOutlined: require("../assets/MaterialSymbolsOutlined.ttf") });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StatusBar barStyle="dark-content" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: BACKGROUND, paddingTop: TOP },
          }}
        />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
