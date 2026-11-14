import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { BackHandler, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomePanel from "../../components/HomePanel";
import { ModelForm } from "../../components/ModelForm";
import ModelsPanel from "../../components/ModelsPanel";
import SettingsPanel from "../../components/SettingsPanel";
import { useSettings } from "../../lib/settings";
import { useAppearance } from "../../lib/appearance";
import StitchIcon, { StitchIconName } from "../../components/StitchIcon";

const TABS: { key: string; icon: StitchIconName; label: string }[] = [
  { key: "home", icon: "explore", label: "Trang chủ" },
  { key: "models", icon: "memory", label: "Model AI" },
  { key: "settings", icon: "tune", label: "Cài đặt" },
];

// Header + noi dung tab + thanh tab duoi. Them/sua model dung Modal ngay trong tab.
export default function TabsLayout() {
  const { styles, ACCENT, ACCENT_ON, TEXT_MUTED } = useAppearance();
  const insets = useSafeAreaInsets();
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
        <Pressable style={styles.headerBrand} accessibilityRole="button" accessibilityLabel="Lumo Lens — xem lại giới thiệu" onPress={() => router.push("/onboarding")}>
          <Image source={require("../../assets/logo.png")} style={styles.brandLogo} resizeMode="contain" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text allowFontScaling={false} style={styles.headerTitle}>Lumo Lens</Text>
            <Text allowFontScaling={false} style={styles.caption}>{tab === "models" ? "Quản lý model AI" : tab === "settings" ? "Tùy chỉnh ứng dụng" : "Dịch màn hình"}</Text>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          {tab === "models" ? <Pressable style={styles.headerAdd} accessibilityRole="button" accessibilityLabel="Thêm model" onPress={() => openForm("new")}><StitchIcon name="add" size={18} color={ACCENT} /><Text allowFontScaling={false} style={styles.manageQuickText}>Thêm</Text></Pressable> : null}
          <Pressable style={styles.compactIconButton} accessibilityRole="button" accessibilityLabel="Mở cài đặt" onPress={() => setTab("settings")}><StitchIcon name="tune" size={22} color={TEXT_MUTED} /></Pressable>
        </View>
      </View>

      {tab === "settings" ? (
        <SettingsPanel />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {tab === "home" ? <HomePanel onManageModels={() => setTab("models")} /> : <ModelsPanel onOpenForm={openForm} />}
        </ScrollView>
      )}

      <View style={[styles.tabBar, { marginBottom: Math.max(insets.bottom, 12) }]}>
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
              <Text allowFontScaling={false} style={[styles.tabLabel, active && styles.tabSelected]}>{item.label}</Text>
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
        <Pressable style={styles.sheetBackdrop} onPress={closeForm}>
          <Pressable style={[styles.modelSheet, styles.modelFormSheet]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} accessibilityElementsHidden />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text allowFontScaling={false} style={styles.sheetTitle}>{formId === "new" ? "Thêm Model AI Mới" : "Chỉnh sửa Model AI"}</Text>
                <Text allowFontScaling={false} style={styles.sheetSubtitle}>Cấu hình thông tin kết nối với model dịch</Text>
              </View>
              <Pressable style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Đóng biểu mẫu model" onPress={closeForm}>
                <Text allowFontScaling={false} style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>
            <ModelForm key={formInstance} id={formId} onClose={closeForm} saving={saving} onSavingChange={changeSaving} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
