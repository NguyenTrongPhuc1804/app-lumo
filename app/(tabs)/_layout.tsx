import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { BackHandler, Modal, Pressable, ScrollView, Text, View } from "react-native";
import HomePanel from "../../components/HomePanel";
import { ModelForm } from "../../components/ModelForm";
import ModelsPanel from "../../components/ModelsPanel";
import SettingsPanel from "../../components/SettingsPanel";
import { useSettings } from "../../lib/settings";
import { styles } from "../../lib/theme";

const TABS = [
  { key: "home", icon: "⌂", label: "Trang chủ" },
  { key: "models", icon: "⚡", label: "Model AI" },
  { key: "settings", icon: "⚙", label: "Cài đặt" },
];

// Header + noi dung tab + thanh tab duoi. Them/sua model dung Modal ngay trong tab.
export default function TabsLayout() {
  const { onboarded } = useSettings();
  const [tab, setTab] = useState("home");
  const [formId, setFormId] = useState("");
  const [formVisible, setFormVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Lan dau mo app: chua xem gioi thieu thi day sang man gioi thieu
      if (onboarded === false) router.replace("/onboarding");

      // Nut back Android: dang mo form thi dong form, dang o tab khac thi ve Trang chu
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (formVisible) {
          setFormVisible(false);
          return true;
        }
        if (tab !== "home") {
          setTab("home");
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [onboarded, formVisible, tab])
  );

  const openForm = (id: string) => {
    setFormId(id);
    setFormVisible(true);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lumo Lens</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Xem lại phần giới thiệu" onPress={() => router.push("/onboarding")}>
          <Text style={styles.headerHelp}>?</Text>
        </Pressable>
      </View>

      {tab === "settings" ? (
        <SettingsPanel />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {tab === "home" ? <HomePanel onManageModels={() => setTab("models")} /> : <ModelsPanel onOpenForm={openForm} />}
        </ScrollView>
      )}

      <View style={styles.tabBar}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabIcon, active && styles.tabActive]}>{item.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFormVisible(false)}>
          <Pressable style={styles.modalCardLarge} onPress={(e) => e.stopPropagation()}>
            <ModelForm id={formId} onClose={() => setFormVisible(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
