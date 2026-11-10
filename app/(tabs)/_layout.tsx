import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { BackHandler, Modal, Pressable, ScrollView, Text, View } from "react-native";
import HomePanel from "../../components/HomePanel";
import { ModelForm } from "../../components/ModelForm";
import ModelsPanel from "../../components/ModelsPanel";
import SettingsPanel from "../../components/SettingsPanel";
import { useSettings } from "../../lib/settings";
import { ACCENT_ON, TEXT_MUTED, styles } from "../../lib/theme";
import StitchIcon, { StitchIconName } from "../../components/StitchIcon";

const TABS: { key: string; icon: StitchIconName; label: string }[] = [
  { key: "home", icon: "explore", label: "Trang chủ" },
  { key: "models", icon: "memory", label: "Model AI" },
  { key: "settings", icon: "tune", label: "Cài đặt" },
];

// Header + noi dung tab + thanh tab duoi. Them/sua model dung Modal ngay trong tab.
export default function TabsLayout() {
  const { onboarded } = useSettings();
  const [tab, setTab] = useState("home");
  const [formId, setFormId] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [formInstance, setFormInstance] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const changeSaving = (value: boolean) => {
    savingRef.current = value;
    setSaving(value);
  };
  const closeForm = () => {
    if (!savingRef.current) setFormVisible(false);
  };

  useFocusEffect(
    useCallback(() => {
      // Lan dau mo app: chua xem gioi thieu thi day sang man gioi thieu
      if (onboarded === false) router.replace("/onboarding");

      // Nut back Android: dang mo form thi dong form, dang o tab khac thi ve Trang chu
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (formVisible) {
          closeForm();
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
    setFormInstance((value) => value + 1);
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
              style={[styles.tabItem, active && styles.tabItemActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item.key)}
            >
              <StitchIcon name={item.icon} size={23} color={active ? ACCENT_ON : TEXT_MUTED} />
              <Text style={[styles.tabLabel, active && styles.tabSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeForm}>
          <Pressable style={styles.modalCardLarge} onPress={(e) => e.stopPropagation()}>
            <ModelForm key={formInstance} id={formId} onClose={closeForm} saving={saving} onSavingChange={changeSaving} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
