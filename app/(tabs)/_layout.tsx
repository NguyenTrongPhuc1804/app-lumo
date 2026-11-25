import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { BackHandler, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AccountPanel from "../../components/AccountPanel";
import HomePanel from "../../components/HomePanel";
import { ModelForm } from "../../components/ModelForm";
import ModelsPanel from "../../components/ModelsPanel";
import PersonGlyph from "../../components/PersonGlyph";
import SettingsPanel from "../../components/SettingsPanel";
import { useAuthStore } from "../../stores/authStore";
import { tabsForRole, type TabKey } from "../../lib/tabs";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "react-i18next";
import StitchIcon from "../../components/StitchIcon";

// Header + noi dung tab + thanh tab duoi. Them/sua model dung Modal ngay trong tab.
export default function TabsLayout() {
  const { styles, ACCENT, ACCENT_ON, TEXT_MUTED } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  // Chi admin moi co tab Model AI
  const tabs = tabsForRole(user);
  const [tab, setTab] = useState<TabKey>("home");
  const [languagePack, setLanguagePack] = useState<string>();
  const openSettings = (pack?: string) => {
    setLanguagePack(pack);
    setTab("settings");
  };
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

  // Mat quyen admin (bi ha quyen hoac tai khoan doi) thi day ve Trang chu,
  // de khong dung lai tab Model AI khong con trong danh sach.
  useFocusEffect(
    useCallback(() => {
      if ((!token && tab === "account") || !tabs.some((item) => item.key === tab)) setTab("home");

      // Nut back Android: dang mo form thi dong form, dang o tab khac thi ve Trang chu
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (formVisible) {
          closeForm();
          return true;
        }
        if (tab !== "home") {          setTab("home");
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [formVisible, tab, tabs, token])
  );

  const openForm = (id: string) => {
    setFormInstance((value) => value + 1);
    setFormId(id);
    setFormVisible(true);
  };

  const subtitle = t(tab === "models" ? "main.modelManagement" : tab === "settings" ? "main.customize" : tab === "account" ? "main.myAccount" : "main.screenTranslation");

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
          {tab === "models" ? <Pressable style={styles.headerAdd} accessibilityRole="button" accessibilityLabel={t("main.addModel")} onPress={() => openForm("new")}><StitchIcon name="add" size={18} color={ACCENT} /><Text allowFontScaling={false} style={styles.manageQuickText}>{t("main.add")}</Text></Pressable> : null}
          <Pressable style={styles.compactIconButton} accessibilityRole="button" accessibilityLabel={t("main.openSettings")} onPress={() => openSettings()}><StitchIcon name="tune" size={22} color={TEXT_MUTED} /></Pressable>
        </View>
      </View>

      {tab === "settings" ? (
        <SettingsPanel initialLanguagePack={languagePack} />
      ) : tab === "account" ? (
        <ScrollView contentContainerStyle={styles.content}>
          <AccountPanel onOpenModels={() => setTab("models")} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {tab === "home" ? <HomePanel onManageModels={() => setTab("models")} onOpenLanguagePacks={openSettings} /> : <ModelsPanel onOpenForm={openForm} />}
        </ScrollView>
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
                <Text allowFontScaling={false} style={styles.sheetTitle}>{t(formId === "new" ? "main.newModel" : "main.editModel")}</Text>
                <Text allowFontScaling={false} style={styles.sheetSubtitle}>{t("main.configureModel")}</Text>
              </View>
              <Pressable style={styles.sheetClose} accessibilityRole="button" accessibilityLabel={t("main.closeForm")} onPress={closeForm}>
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
