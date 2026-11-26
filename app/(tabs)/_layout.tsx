import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { BackHandler, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AccountPanel from "../../components/AccountPanel";
import HomePanel from "../../components/HomePanel";
import PersonGlyph from "../../components/PersonGlyph";
import SettingsPanel from "../../components/SettingsPanel";
import StitchIcon from "../../components/StitchIcon";
import { useAuthStore } from "../../stores/authStore";
import { useModelStore } from "../../stores/modelStore";
import { tabs, type TabKey } from "../../lib/tabs";
import { useTheme } from "../../hooks/useTheme";

export default function TabsLayout() {
  const { styles, ACCENT_ON, TEXT_MUTED } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<TabKey>("home");
  const [languagePack, setLanguagePack] = useState<string>();
  const reloadMe = useAuthStore((s) => s.reloadMe);
  const reloadModels = useModelStore((s) => s.reloadModels);
  const [refreshing, setRefreshing] = useState(false);

  const refreshTab = async () => {
    setRefreshing(true);
    try {
      if (tab === "settings") await reloadModels();
      else if (token) await reloadMe();
    } catch {
      // Store đã lưu lỗi để màn hình hiển thị.
    } finally {
      setRefreshing(false);
    }
  };
  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={refreshTab} />;

  const openSettings = (pack?: string) => {
    setLanguagePack(pack);
    setTab("settings");
  };

  useFocusEffect(
    useCallback(() => {
      if (!token && tab === "account") setTab("home");
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (tab === "home") return false;
        setTab("home");
        return true;
      });
      return () => sub.remove();
    }, [tab, token])
  );

  const subtitle = t(tab === "settings" ? "main.customize" : tab === "account" ? "main.myAccount" : "main.screenTranslation");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable style={styles.headerBrand} accessibilityRole="button" accessibilityLabel={t("main.openAccount")} onPress={() => token ? setTab("account") : router.push("/login")}>
          <Image source={require("../../assets/logo.png")} style={styles.brandLogo} resizeMode="contain" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text allowFontScaling={false} style={styles.headerTitle}>Lumo Lens</Text>
            <Text allowFontScaling={false} style={styles.caption}>{subtitle}</Text>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable style={styles.compactIconButton} accessibilityRole="button" accessibilityLabel={t("main.openSettings")} onPress={() => openSettings()}><StitchIcon name="tune" size={22} color={TEXT_MUTED} /></Pressable>
        </View>
      </View>

      {tab === "settings" ? (
        <SettingsPanel initialLanguagePack={languagePack} refreshControl={refreshControl} />
      ) : tab === "account" ? (
        <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
          <AccountPanel />
        </ScrollView>
      ) : (
        <HomePanel onOpenLanguagePacks={openSettings} />
      )}

      <View style={[styles.tabBar, { marginBottom: Math.max(insets.bottom, 12) }]}>
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => item.key === "settings" ? openSettings() : item.key === "account" && !token ? router.push("/login") : setTab(item.key)}
            >
              {item.icon === "person"
                ? <PersonGlyph size={20} color={active ? ACCENT_ON : TEXT_MUTED} />
                : <StitchIcon name={item.icon} size={23} color={active ? ACCENT_ON : TEXT_MUTED} />}
              <Text allowFontScaling={false} style={[styles.tabLabel, active && styles.tabSelected]}>{t(`main.${item.key}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
