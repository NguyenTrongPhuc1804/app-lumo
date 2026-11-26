import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useModelStore } from "../stores/modelStore";
import { useServiceStore } from "../stores/serviceStore";
import { useAppearanceStore } from "../stores/appearanceStore";
import type { TextSize } from "../lib/appearance-options";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "./StitchIcon";
import LanguageFlag from "./LanguageFlag";
import LanguagePacksPanel from "./LanguagePacksPanel";
import ScreenTranslator from "../modules/screen-translator";
import { INTERFACE_LANGUAGES, type InterfaceLanguage } from "../lib/interface-language";
import { useLanguageStore } from "../stores/languageStore";

const languageOptions = Object.keys(INTERFACE_LANGUAGES) as InterfaceLanguage[];
const chipIconRow = { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%" } as const;
const textSizeIcons = { auto: 16, tiny: 11, small: 13, normal: 16, large: 19 } satisfies Record<TextSize, number>;

export default function SettingsPanel({ initialLanguagePack }: { initialLanguagePack?: string } = {}) {
  const { styles, ACCENT, ACCENT_ON, TEXT_DIM } = useTheme();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const preference = useLanguageStore((s) => s.preference);
  const setPreference = useLanguageStore((s) => s.setPreference);
  const languageStorageError = useLanguageStore((s) => s.storageError);
  const colorMode = useAppearanceStore((s) => s.colorMode);
  const textSize = useAppearanceStore((s) => s.textSize);
  const setColorMode = useAppearanceStore((s) => s.setColorMode);
  const setTextSize = useAppearanceStore((s) => s.setTextSize);
  const appearanceStorageError = useAppearanceStore((s) => s.storageError);
  const hasOverlayPermission = useServiceStore((s) => s.hasOverlayPermission);
  const reloadModels = useModelStore((s) => s.reloadModels);
  const modelsLoading = useModelStore((s) => s.modelsLoading);
  const modelsError = useModelStore((s) => s.modelsError);
  // Store trả về chuỗi tiếng Việt thay vì mã lỗi.
  const appearanceErrorKey = appearanceStorageError === t("settings.appearanceReadError", { lng: "vi" })
    ? "settings.appearanceReadError"
    : "settings.appearanceSaveError";

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.pageTitle}>{t("settings.title")}</Text>
        <Text allowFontScaling={false} style={styles.hint}>{t("settings.description")}</Text>
      </View>
      {Platform.OS === "android" && initialLanguagePack && <LanguagePacksPanel initialLanguage={initialLanguagePack} />}
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>{t("settings.appearance")}</Text>
        <Text allowFontScaling style={styles.inputLabel}>{t("settings.language")}</Text>
        <View style={styles.modelActionsRow} accessibilityRole="radiogroup" accessible={false}>
          {languageOptions.map((option) => {
            const label = INTERFACE_LANGUAGES[option];
            const checked = (preference === "system" ? language : preference) === option;
            return (
              <Pressable key={option} style={[styles.actionBtn, chipIconRow, checked && styles.actionBtnAccent]} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked }} onPress={() => void setPreference(option)}>
                <LanguageFlag language={option} />
                <Text allowFontScaling style={[checked ? styles.actionBtnAccentText : styles.actionBtnText, { flexShrink: 1 }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {languageStorageError ? (
          <Text allowFontScaling style={styles.hint}>{t(languageStorageError === "read" ? "settings.readError" : "settings.saveError")}</Text>
        ) : null}
        <Text allowFontScaling={false} style={styles.inputLabel}>{t("settings.color")}</Text>
        <View style={styles.modelActionsRow} accessibilityRole="radiogroup" accessible={false}>
          {(["light", "dark"] as const).map((mode) => {
            const checked = colorMode === mode;
            const label = t(`settings.${mode}`);
            return (
              <Pressable key={mode} style={[styles.actionBtn, chipIconRow, checked && styles.actionBtnAccent]} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked }} onPress={() => setColorMode(mode)}>
                <StitchIcon name={mode === "light" ? "light_mode" : "dark_mode"} size={16} color={checked ? ACCENT_ON : TEXT_DIM} />
                <Text style={[checked ? styles.actionBtnAccentText : styles.actionBtnText, { flexShrink: 1 }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text allowFontScaling={false} style={styles.inputLabel}>{t("settings.size")}</Text>
        <View style={styles.modelActionsRow} accessibilityRole="radiogroup" accessible={false}>
          {(["auto", "tiny", "small", "normal", "large"] satisfies TextSize[]).map((option) => {
            const checked = textSize === option;
            const label = t(`settings.${option}`);
            return (
              <Pressable key={option} style={[styles.actionBtn, chipIconRow, checked && styles.actionBtnAccent]} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked }} onPress={() => setTextSize(option)}>
                <StitchIcon name={option === "auto" ? "format_size" : "text_fields"} size={textSizeIcons[option]} color={checked ? ACCENT_ON : TEXT_DIM} />
                <Text style={[checked ? styles.actionBtnAccentText : styles.actionBtnText, { flexShrink: 1 }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.infoBox}><Text allowFontScaling={false} style={styles.sectionTitle}>{t("settings.previewTitle")}</Text><Text allowFontScaling={false} style={styles.hint}>{t("settings.previewHelp")}</Text></View>
        {appearanceStorageError ? (
          <Text allowFontScaling={false} style={styles.hint}>
            {language === "vi" ? appearanceStorageError : t(appearanceErrorKey)}
          </Text>
        ) : null}
      </View>
      {Platform.OS === "android" && !initialLanguagePack && <LanguagePacksPanel />}
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>{t("settings.permission")}</Text>
        <View style={styles.iconLabel}><StitchIcon name="layers" color={ACCENT} /><Text allowFontScaling={false} style={[styles.sectionTitle, { flex: 1 }]}>{t("settings.overlay")}</Text></View>
        {hasOverlayPermission ? (
          <Text allowFontScaling={false} style={styles.ok}>{t("settings.granted")}</Text>
        ) : (
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => ScreenTranslator.openOverlaySettings()}>
            <Text allowFontScaling={false} style={styles.secondaryButtonText}>{t("settings.grant")}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.caption}>{t("settings.connection")}</Text>
        <View style={styles.iconLabel}><StitchIcon name="dns" color={ACCENT} /><Text allowFontScaling={false} style={styles.sectionTitle}>{t("settings.server")}</Text></View>
        {modelsLoading ? <View style={styles.rowBetween}><ActivityIndicator /><Text allowFontScaling={false} style={styles.hint}>{t("settings.loading")}</Text></View> : null}
        {modelsError ? <View><Text allowFontScaling={false} style={styles.hint}>{language === "vi" ? modelsError : t("settings.modelLoadError")}</Text><Pressable disabled={modelsLoading} onPress={reloadModels}><Text allowFontScaling={false} style={styles.actionBtnText}>{t("settings.retry")}</Text></Pressable></View> : null}
        <Pressable style={styles.secondaryButton} accessibilityRole="button" disabled={modelsLoading} onPress={reloadModels}>
          <View style={styles.iconLabel}><StitchIcon name="speed" size={20} color={ACCENT} /><Text allowFontScaling={false} style={styles.secondaryButtonText}>{t(modelsLoading ? "settings.checking" : "settings.check")}</Text></View>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.caption}>{t("settings.account")}</Text>
        <View style={styles.iconLabel}><StitchIcon name="dns" color={ACCENT} /><Text allowFontScaling={false} style={[styles.sectionTitle, { flex: 1 }]}>{t("settings.models")}</Text></View>
        <Text allowFontScaling={false} style={styles.hint}>{t("settings.roleInfo")}</Text>
      </View>
    </ScrollView>
  );
}
