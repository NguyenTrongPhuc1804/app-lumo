import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Alert, AppState, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { fetchGuestQuota, startTranslator, stopTranslator } from "../lib/api";
import { ML_KIT_LANGUAGES, OCR_LANGUAGES } from "../lib/translation-languages";
import TranslationLanguagePicker from "./TranslationLanguagePicker";
import { useTranslation } from "react-i18next";
import { canUseAiModel, mainInterfaceError, modelOptionLabel, translationLanguageLabel } from "../lib/main-interface-labels";
import { useConfigStore } from "../stores/configStore";
import { useAuthStore } from "../stores/authStore";
import { useModelStore } from "../stores/modelStore";
import { useServiceStore } from "../stores/serviceStore";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "./StitchIcon";
import ScreenTranslator from "../modules/screen-translator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mot dong "ten - hanh dong" trong cac khoi huong dan
function GestureRow({ name, action, last }: { name: string; action: string; last?: boolean }) {
  const { styles } = useTheme();
  return (
    <View style={[styles.gestureRow, !last && styles.gestureRowBorder]}>
      <Text allowFontScaling={false} style={styles.gestureName}>{name}</Text>
      <Text allowFontScaling={false} style={styles.gestureAction}>{action}</Text>
    </View>
  );
}

export default function HomePanel({ onManageModels, onOpenLanguagePacks }: { onManageModels: () => void; onOpenLanguagePacks: (language: string) => void }) {
  const { styles, ACCENT, ACCENT_ON, TEXT_DIM } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n?.resolvedLanguage;
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const sourceLang = useConfigStore((s) => s.sourceLang);
  const targetLang = useConfigStore((s) => s.targetLang);
  const model = useConfigStore((s) => s.model);
  const translationMode = useConfigStore((s) => s.translationMode);
  const setTranslationMode = useConfigStore((s) => s.setTranslationMode);
  const setModel = useConfigStore((s) => s.setModel);
  const chooseLanguage = useConfigStore((s) => s.chooseLanguage);
  const swapLanguages = useConfigStore((s) => s.swapLanguages);
  const modelList = useModelStore((s) => s.modelList);
  const customModels = useModelStore((s) => s.customModels);
  const modelsLoading = useModelStore((s) => s.modelsLoading);
  const modelsError = useModelStore((s) => s.modelsError);
  const reloadModels = useModelStore((s) => s.reloadModels);
  const running = useServiceStore((s) => s.running);
  const setRunning = useServiceStore((s) => s.setRunning);
  const hasOverlayPermission = useServiceStore((s) => s.hasOverlayPermission);
  const [pickerFor, setPickerFor] = useState<"source" | "target" | "model" | null>(null);

  const [trial, setTrial] = useState<{ remaining: number; freeLimit: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const [packs, setPacks] = useState<string[] | null>(null);
  const [packError, setPackError] = useState(false);
  const paidFeatures = Boolean(token) && (user?.isAdmin === true || !!(user?.proExpiresAt && Date.parse(user.proExpiresAt) > Date.now()));
  const coinEnabled = user?.coinPaymentsEnabled === true;
  const basic = !canUseAiModel(modelList.find(item => item.code === model), Boolean(token), paidFeatures, coinEnabled);
  const missingPacks = basic && packs && !packError
    ? [sourceLang, targetLang].filter(lang => lang !== "en" && !packs.includes(lang)) : [];

  const refreshPacks = async () => {
    try {
      setPacks(await ScreenTranslator.getDownloadedLanguagePacks());
      setPackError(false);
    } catch { setPackError(true); }
  };
  useEffect(() => {
    if (Platform.OS !== "android" || !basic) return;
    void refreshPacks();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refreshPacks(); });
    return () => subscription.remove();
  }, [basic]);

  useEffect(() => {
    setTrial(null);
    if (token || !serverUrl.trim() || Platform.OS !== "android") return;
    let request = 0;
    const refresh = async () => {
      const id = ++request;
      try {
        const quota = await fetchGuestQuota(serverUrl);
        if (id === request) setTrial(quota);
      } catch { if (id === request) setTrial(null); }
    };
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => { request++; subscription.remove(); };
  }, [serverUrl, token]);

  // Hieu ung: nut tron co lai khi nhan, phap phong khi dang bat; nut doi ngon ngu xoay 180 do
  const pressScale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const swapRotation = useSharedValue(0);

  useEffect(() => {
    pulse.value = running ? withRepeat(withTiming(1.06, { duration: 900 }), -1, true) : withTiming(1);
  }, [running]);

  const startCircleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value * pulse.value }] }));
  const swapStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${swapRotation.value}deg` }] }));

  const handleSwap = () => {
    swapRotation.value = withSpring(swapRotation.value + 180);
    swapLanguages();
  };

  // Nut tron lon: bat hoac tat widget dich
  const handleToggle = async () => {
    if (running) {
      stopTranslator();
      setRunning(false);
      return;
    }
    if (!hasOverlayPermission) {
      Alert.alert(t("main.overlayRequired"), t("main.overlayExplain"), [
        { text: t("main.later"), style: "cancel" },
        { text: t("main.openSettings"), onPress: () => ScreenTranslator.openOverlaySettings() },
      ]);
      return;
    }
    if (!serverUrl.trim()) {
      Alert.alert(t("main.serverRequired"), t("main.serverExplain"));
      return;
    }
    setStarting(true);
    try {
      if (basic && Platform.OS === "android") {
        const downloaded = await ScreenTranslator.getDownloadedLanguagePacks();
        setPacks(downloaded);
        setPackError(false);
        const missing = [sourceLang, targetLang].find(lang => lang !== "en" && !downloaded.includes(lang));
        if (missing) {
          Alert.alert(t("main.languagePackRequired"), t("main.languagePackPath"), [
            { text: t("main.later"), style: "cancel" },
            { text: t("main.languagePacks"), onPress: () => onOpenLanguagePacks(missing) },
          ]);
          return;
        }
      }
      if (!token) {
        const quota = await fetchGuestQuota(serverUrl);
        setTrial(quota);
        if (quota.remaining === 0) {
          Alert.alert(t("main.trialExhausted"), t("main.trialSignIn", { value: quota.freeLimit }), [
            { text: t("main.later"), style: "cancel" }, { text: t("main.signIn"), onPress: () => router.push("/login") },
          ]);
          return;
        }
      }
      const granted = await startTranslator({ serverUrl, token: token ?? "", sourceLang, targetLang, model: basic ? "ml-kit" : model, mode: basic || !paidFeatures ? "game" : translationMode, allowAutomatic: paidFeatures, accentColor: "#BDB5FF" });
      if (granted) setRunning(true);
      else Alert.alert(t("main.captureDenied"), t("main.captureExplain"));
    } catch (error) {
      Alert.alert(t("main.lensFailed"), error instanceof Error ? mainInterfaceError(error.message, t) : t("main.tryAgain"));
    } finally { setStarting(false); }
  };

  const customModel = customModels.find((item) => item.code === model);
  const currentModel = modelList.find((item) => item.code === model);
  const currentModelName = customModel?.name != null
    ? t("main.personalModel", { value: customModel.name })
    : (currentModel && modelOptionLabel(currentModel, t)) || model;

  return (
    <>
      {!token && <View style={styles.card}>
        <Text style={styles.hint}>{trial ? (trial.remaining > 0 ? t("main.trialRemain", { value: trial.remaining }) : t("main.trialExhausted")) : t("main.trialNoAccount")}</Text>
        {trial?.remaining === 0 && <Text style={styles.hint}>{t("main.trialDailyLimit", { value: trial.freeLimit })}</Text>}
        <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => router.push("/login")}>
          <Text style={styles.secondaryButtonText}>{t(trial?.remaining === 0 ? "main.signInContinue" : "main.signIn")}</Text>
        </Pressable>
      </View>}
      {/* Khoi bat dau dich: khoi lon nhat, mau nhan */}
      <View style={styles.startHero}>
        <Text allowFontScaling={false} style={styles.heroTitle}>{t("main.screenTranslation")}</Text>
        <AnimatedPressable
          style={[styles.lensTrigger, startCircleStyle]}
          accessibilityRole="button"
          accessibilityLabel={t(running ? "main.disableFloating" : "main.enableFloating")}
          onPressIn={() => (pressScale.value = withSpring(0.97))}
          onPressOut={() => (pressScale.value = withSpring(1))}
          disabled={starting}
          onPress={handleToggle}
        >
          <LinearGradient colors={["#10B981", "#38BDF8"]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.lensRing}>
            <View style={styles.lensFace}>
              <LinearGradient colors={["#10B981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lensCore}>
                <StitchIcon name={running ? "crop_free" : "play_arrow"} size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </LinearGradient>
        </AnimatedPressable>
        <Text allowFontScaling={false} style={styles.lensActionLabel}>{t(running ? "main.stopLens" : "main.startLens")}</Text>
        <Text allowFontScaling={false} style={styles.lensStatus}>{t(running ? "main.floatingOn" : "main.floatingOff")}</Text>
        <Text allowFontScaling={false} style={styles.heroText}>
          {t(running ? "main.floatingOnHint" : "main.floatingOffHint")}
        </Text>
      </View>
      {!hasOverlayPermission ? (
        <View style={styles.card}>
          <Text allowFontScaling={false} style={styles.warning}>{t("main.overlayWarning")}</Text>
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => ScreenTranslator.openOverlaySettings()}>
            <Text allowFontScaling={false} style={styles.secondaryButtonText}>{t("main.grantOverlay")}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Khoi chon ngon ngu */}
      <View style={styles.bentoRow}>
      <View style={styles.bentoTile}>
        <View style={styles.iconLabel}><StitchIcon name="translate" color={ACCENT} /><Text allowFontScaling={false} style={styles.sectionTitle}>{t("main.pair")}</Text></View>
        <View style={styles.langRow}>
          <View style={styles.langColumn}>
            <Text allowFontScaling={false} style={styles.langCaption}>{t("main.source")}</Text>
            <Pressable style={styles.langButton} accessibilityRole="button" onPress={() => setPickerFor("source")}>
              <View style={styles.iconLabel}><Text allowFontScaling={false} style={styles.langButtonText}>{translationLanguageLabel(sourceLang, t)}</Text><StitchIcon name="expand_more" size={18} color={TEXT_DIM} /></View>
            </Pressable>
          </View>
          <Pressable style={[styles.swapButton, !OCR_LANGUAGES.includes(targetLang) && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel={t("main.swap")} accessibilityState={{ disabled: !OCR_LANGUAGES.includes(targetLang) }} disabled={!OCR_LANGUAGES.includes(targetLang)} onPress={handleSwap}>
            <Animated.View style={swapStyle}><StitchIcon name="sync_alt" color={ACCENT} /></Animated.View>
          </Pressable>
          <View style={styles.langColumn}>
            <Text allowFontScaling={false} style={styles.langCaption}>{t("main.target")}</Text>
            <Pressable style={styles.langButton} accessibilityRole="button" onPress={() => setPickerFor("target")}>
              <View style={styles.iconLabel}><Text allowFontScaling={false} style={styles.langButtonText}>{translationLanguageLabel(targetLang, t, locale)}</Text><StitchIcon name="expand_more" size={18} color={TEXT_DIM} /></View>
            </Pressable>
          </View>
        </View>
        {missingPacks.length > 0 && <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => onOpenLanguagePacks(missingPacks[0])}>
          <Text accessibilityLiveRegion="polite" style={styles.hint}>{t("main.missingPacks", { value: missingPacks.map(lang => translationLanguageLabel(lang, t, locale)).join(", ") })}</Text>
          <Text style={styles.secondaryButtonText}>{t("main.languagePackPath")}</Text>
        </Pressable>}
        {basic && packError && <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => void refreshPacks()}>
          <Text style={styles.secondaryButtonText}>{t("main.retry")}</Text>
        </Pressable>}
      </View>

      {/* Khoi chon model dich: thay ten model dang dung ngay tren khoi */}
      <View style={styles.bentoTile}>
        <View style={styles.iconLabel}><StitchIcon name="memory" color={ACCENT} /><Text allowFontScaling={false} style={styles.sectionTitle}>{t("main.translationEngine")}</Text></View>
        <Text allowFontScaling={false} style={styles.langPairValue}>{basic ? t("main.onDeviceTranslation") : currentModelName}</Text>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel={t("main.chooseEngine")} onPress={() => setPickerFor("model")}>
          <Text style={styles.secondaryButtonText}>{t("main.chooseEngine")}</Text>
        </Pressable>
        {!basic && paidFeatures && <View style={{ gap: 8, marginTop: 16 }}>
          {(["game", "manga"] as const).map((mode) => {
            const selected = translationMode === mode;
            const color = mode === "game" ? "#16735D" : "#2167AA";
            return (
              <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: selected }}
                accessibilityLabel={t(mode === "game" ? "main.gameModeA11y" : "main.mangaModeA11y")}
                accessibilityHint={t(mode === "game" ? "main.gameHint" : "main.mangaHint")}
                onPress={() => setTranslationMode(mode)}
                style={{ minHeight: 44, borderRadius: 24, borderWidth: selected ? 2 : 1, borderColor: selected ? color : mode === "game" ? "#B6EBD8" : "#BEDFFF", backgroundColor: mode === "game" ? "#ECFBF3" : "#F0F8FF", paddingHorizontal: 10, paddingVertical: 9, alignItems: "center", justifyContent: "center" }}>
                <View style={[styles.iconLabel, { gap: 6 }]}>
                  <StitchIcon name={mode === "game" ? "sports_esports" : "menu_book"} color={color} size={18} />
                  <Text allowFontScaling={false} style={[styles.secondaryButtonText, { color, fontSize: 13, flexShrink: 1 }]}>{t(mode === "game" ? "main.gameMode" : "main.mangaMode")}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>}
      </View>
      </View>

      {/* Khoi huong dan cu chi, rut gon hien thi ban dau */}
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>{t("main.gestures")}</Text>
        <GestureRow name={t("main.doubleTap")} action={t("main.fullScreen")} />
        <GestureRow name={t("main.hold")} action={t("main.selectRegion")} />
        <GestureRow name={t("main.tap")} action={t("main.toolbar")} last />
      </View>

      {(pickerFor === "source" || pickerFor === "target") && <TranslationLanguagePicker
        title={t(pickerFor === "source" ? "main.sourceLanguage" : "main.target")}
        codes={pickerFor === "source" ? OCR_LANGUAGES : ML_KIT_LANGUAGES}
        selected={pickerFor === "source" ? sourceLang : targetLang}
        onClose={() => setPickerFor(null)}
        onSelect={(code) => { chooseLanguage(pickerFor, code); setPickerFor(null); }}
      />}
      <Modal visible={pickerFor === "model"} transparent animationType="slide" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerFor(null)}>
          <View style={styles.modelSheet}>
            <View style={styles.sheetHandle} accessibilityElementsHidden />
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text allowFontScaling={false} style={styles.sheetTitle}>{t("main.chooseEngine")}</Text>
                  <Text style={styles.sheetSubtitle}>{t("main.chooseEngineHint")}</Text>
                </View>
                <Pressable style={styles.sheetClose} accessibilityRole="button" accessibilityLabel={t("main.closePicker")} onPress={() => setPickerFor(null)}>
                  <Text allowFontScaling={false} style={styles.sheetCloseText}>×</Text>
                </Pressable>
              </View>
            {pickerFor === "model" && (
              <>
                {modelsLoading ? <View style={styles.rowBetween}><ActivityIndicator /><Text allowFontScaling={false} style={styles.hint}>{t("main.loadingModels")}</Text></View> : null}
                {modelsError ? <View style={styles.sheetState}><Text allowFontScaling={false} style={styles.hint}>{mainInterfaceError(modelsError, t)}</Text><Pressable disabled={modelsLoading} style={styles.retryButton} onPress={reloadModels}><Text allowFontScaling={false} style={styles.actionBtnText}>{t("main.retry")}</Text></Pressable></View> : null}
                {user?.coinPaymentsEnabled && <Text style={styles.hint}>{t("main.coinBalance", { value: user.coinBalance ?? 0 })}</Text>}
                <ScrollView style={styles.modelPickerList} contentContainerStyle={{ gap: 8 }}>
                  {[{ code: "ml-kit", label: t("main.onDeviceTranslation"), coinPrice: 0 }, ...modelList.filter(m => m.code !== "ml-kit")].map((m) => {
                    const local = m.code === "ml-kit";
                    const selected = local ? basic : !basic && model === m.code;
                    const price = m.coinPrice ?? 0;
                    const unavailable = !local && !canUseAiModel(m, Boolean(token), paidFeatures, coinEnabled);
                    const label = local ? m.label : modelOptionLabel(m, t);
                    return (
                      <Pressable
                        key={m.code}
                        style={[styles.modelPickerItem, selected && styles.modelPickerItemSelected]}
                        accessibilityRole="radio"
                        accessibilityLabel={label}
                        accessibilityState={{ selected, disabled: unavailable }}
                        disabled={unavailable}
                        onPress={() => {
                          setModel(m.code);
                          setPickerFor(null);
                        }}
                      >
                        <View style={[styles.modelPickerGlyph, selected && styles.modelPickerGlyphSelected]}><StitchIcon name={local ? "translate" : "memory"} size={20} color={selected ? ACCENT_ON : ACCENT} /></View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.modalItemText}>{label}</Text>
                          <Text style={styles.modelCodeSub}>{local ? t("main.onDeviceHint") : m.code}{price > 0 ? ` · ${t("main.coinPrice", { value: price })}` : ""}{unavailable ? ` · ${t("main.unavailable")}` : ""}</Text>
                        </View>
                        <View style={[styles.modelRadio, selected && styles.modelPickerCheck]}>{selected ? <StitchIcon name="check" size={16} color={ACCENT_ON} /> : null}</View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {token && user?.isAdmin && <Pressable style={styles.manageQuickBtn} accessibilityRole="button" onPress={() => { setPickerFor(null); onManageModels(); }}>
                  <View style={styles.iconLabel}><StitchIcon name="tune" size={20} color={ACCENT} /><Text allowFontScaling={false} style={[styles.manageQuickText, { flex: 1 }]}>{t("main.managePersonal")}</Text><StitchIcon name="chevron_right" size={20} color={ACCENT} /></View>
                </Pressable>}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
