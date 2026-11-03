import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider } from "../lib/settings";
import { BACKGROUND } from "../lib/theme";

// padding tren de khong bi thanh trang thai che
const TOP = StatusBar.currentHeight ?? 0;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
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
