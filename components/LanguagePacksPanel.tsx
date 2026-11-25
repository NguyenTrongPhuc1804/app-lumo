import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../hooks/useTheme";
import { ML_KIT_LANGUAGES } from "../lib/translation-languages";
import TranslationLanguagePicker from "./TranslationLanguagePicker";
import StitchIcon from "./StitchIcon";
import { translationLanguageLabel } from "../lib/main-interface-labels";
import ScreenTranslator from "../modules/screen-translator";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useServiceStore } from "../stores/serviceStore";

const downloadableLanguages = ML_KIT_LANGUAGES.filter(code => code !== "en");

export default function LanguagePacksPanel({ initialLanguage }: { initialLanguage?: string }) {
  const { t, i18n } = useTranslation();
  const { styles, TEXT_DIM } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const serverUrl = useConfigStore(s => s.serverUrl);
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const running = useServiceStore(s => s.running);
  const [packs, setPacks] = useState<string[] | null>(null);
  const [packBusy, setPackBusy] = useState<string | null>(null);
  const [packError, setPackError] = useState(false);
  const [offlineRemaining, setOfflineRemaining] = useState<number | null>(null);
  const [offlineBusy, setOfflineBusy] = useState(false);

  const refreshPacks = async () => {
    try {
      setPacks(await ScreenTranslator.getDownloadedLanguagePacks());
      setPackError(false);
    } catch { setPackError(true); }
  };
  useEffect(() => { void refreshPacks(); }, []);

  useEffect(() => {
    setOfflineRemaining(null);
    if (!token) return;
    let active = true;
    const refresh = () => {
      void ScreenTranslator.getOfflineTranslationRemaining(serverUrl, token)
        .then(value => { if (active) setOfflineRemaining(value); })
        .catch(() => { if (active) setOfflineRemaining(0); });
    };
    refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => { active = false; subscription.remove(); };
  }, [serverUrl, token, running]);

  const changePack = async (language: string, installed: boolean) => {
    setPackBusy(language);
    setPackError(false);
    try {
      if (installed) await ScreenTranslator.deleteLanguagePack(language);
      else await ScreenTranslator.downloadLanguagePack(language);
      await refreshPacks();
    } catch { setPackError(true); }
    finally { setPackBusy(null); }
  };
  const prepareOffline = async () => {
    if (!token || offlineBusy || offlineRemaining !== 0) return;
    const available = user?.dailyLimit == null ? 3 : Math.max(1, user.dailyLimit - user.usageCount);
    setOfflineBusy(true);
    try {
      const ok = await ScreenTranslator.prepareOfflineTranslation(serverUrl, token, Math.min(3, available));
      const current = useAuthStore.getState();
      if (current.token !== token || useConfigStore.getState().serverUrl !== serverUrl) {
        ScreenTranslator.clearOfflineTranslation(serverUrl, token);
        return;
      }
      void current.reloadMe().catch(() => {});
      if (!ok) Alert.alert(t("main.offlinePrepare"), t("main.offlineQuotaUnavailable"));
      else setOfflineRemaining(await ScreenTranslator.getOfflineTranslationRemaining(serverUrl, token));
    } catch { Alert.alert(t("main.offlinePrepare"), t("main.tryAgain")); }
    finally { setOfflineBusy(false); }
  };

  const installed = packs?.includes(selectedLanguage) ?? false;
  const packActionDisabled = packBusy !== null || packs === null || packError || (installed && running);
  const choosePack = t("main.chooseLanguagePack");

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t("main.languagePacks")}</Text>
      <Text style={styles.hint}>{t("main.onDeviceHint")}</Text>
      {packs === null && !packError && <ActivityIndicator accessibilityLabel={t("main.packWorking")} />}
      {packError && <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => void refreshPacks()}>
        <Text style={styles.secondaryButtonText}>{t("main.retry")}</Text>
      </Pressable>}
      <Pressable style={styles.langButton} accessibilityRole="button" accessibilityHint={choosePack} onPress={() => setPickerOpen(true)}>
        <View style={styles.iconLabel}>
          <Text style={styles.langButtonText}>{selectedLanguage ? translationLanguageLabel(selectedLanguage, t, i18n?.resolvedLanguage) : choosePack}</Text>
          <StitchIcon name="expand_more" size={18} color={TEXT_DIM} />
        </View>
      </Pressable>
      {pickerOpen && <TranslationLanguagePicker title={choosePack} codes={downloadableLanguages} selected={selectedLanguage}
        onClose={() => setPickerOpen(false)} onSelect={(code) => { setSelectedLanguage(code); setPickerOpen(false); }} />}
      {selectedLanguage && <>
        {packs !== null && !packError && <Text style={styles.hint} accessibilityLiveRegion="polite">{t(installed ? "main.packInstalled" : "main.packNotInstalled")}</Text>}
        <Pressable style={styles.secondaryButton} accessibilityRole="button" disabled={packActionDisabled}
          accessibilityState={{ busy: packBusy === selectedLanguage, disabled: packActionDisabled }} onPress={() => void changePack(selectedLanguage, installed)}>
          <Text style={styles.secondaryButtonText}>{t(packBusy === selectedLanguage ? "main.packWorking" : installed ? "main.packDelete" : "main.packDownload")}</Text>
        </Pressable>
      </>}
      {token && <>
        {offlineRemaining !== null && <Text style={styles.hint}>{offlineRemaining === -1 ? t("main.offlineProReady") : t("main.offlineRemaining", { value: offlineRemaining })}</Text>}
        <Pressable style={styles.secondaryButton} accessibilityRole="button" disabled={offlineBusy || offlineRemaining !== 0 || !serverUrl.trim()}
          accessibilityState={{ busy: offlineBusy, disabled: offlineBusy || offlineRemaining !== 0 || !serverUrl.trim() }} onPress={() => void prepareOffline()}>
          <Text style={styles.secondaryButtonText}>{t(offlineBusy ? "main.packWorking" : "main.offlinePrepare")}</Text>
        </Pressable>
      </>}
    </View>
  );
}
