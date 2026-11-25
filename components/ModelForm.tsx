import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import StitchIcon from "./StitchIcon";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useModelStore } from "../stores/modelStore";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "react-i18next";
import { mainInterfaceError } from "../lib/main-interface-labels";

// id = "new" thi tao moi, con lai la id model tren server
export function ModelForm({ id, onClose, saving, onSavingChange }: { id: string; onClose: () => void; saving: boolean; onSavingChange: (value: boolean) => void }) {
  const { styles, ACCENT, TEXT_MUTED, DANGER } = useTheme();
  const { t } = useTranslation();
  const savingRef = useRef(false);
  const testingRef = useRef(false);
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const token = useAuthStore((s) => s.token) ?? "";
  const setModel = useConfigStore((s) => s.setModel);
  const customModels = useModelStore((s) => s.customModels);
  const reloadAdminModels = useModelStore((s) => s.reloadAdminModels);
  const reloadModels = useModelStore((s) => s.reloadModels);
  const isNew = id === "new";
  const editing = isNew ? null : customModels.find((m) => m.id === id) ?? null;

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [keyTest, setKeyTest] = useState<
    | { state: "idle" | "loading" }
    | { state: "ok"; sample: string }
    | { state: "fail"; reason: "missingId" | "http" | "message"; detail?: string | number }
  >({ state: "idle" });

  // Dien san du lieu khi sua. key da che tu server nen khong dien vao o nhap.
  useEffect(() => {
    setFormName(editing?.name ?? "");
    setFormCode(editing?.code ?? "");
    setFormDescription(editing?.description ?? "");
    setFormBaseUrl(editing?.baseUrl ?? "");
    setFormApiKey("");
    setKeyTest({ state: "idle" });
  }, [id]);

  const apiBase = serverUrl.trim().replace(/\/+$/, "");
  const adminHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Kiem tra baseUrl + apiKey truoc khi luu. Key de trong thi server dung key da luu.
  const handleTest = async () => {
    if (savingRef.current || testingRef.current) return;
    if (!formCode.trim()) {
      setKeyTest({ state: "fail", reason: "missingId" });
      return;
    }
    testingRef.current = true;
    setKeyTest({ state: "loading" });
    try {
      const res = await fetch(`${apiBase}/api/admin/models/verify`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          id: isNew ? undefined : id,
          model: formCode.trim(),
          baseUrl: formBaseUrl.trim(),
          apiKey: formApiKey.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setKeyTest(data.error ? { state: "fail", reason: "message", detail: data.error } : { state: "fail", reason: "http", detail: res.status });
        return;
      }
      setKeyTest({ state: "ok", sample: String(data.sample ?? "") });
    } catch (err: any) {
      setKeyTest({ state: "fail", reason: "message", detail: err.message });
    } finally {
      testingRef.current = false;
    }
  };

  // Luu len server: tao moi hoac sua. Server tu goi thu model truoc khi luu.
  const handleSave = async () => {
    if (savingRef.current || testingRef.current) return;
    if (!formName.trim() || !formCode.trim()) {
      Alert.alert(t("main.missingInfo"), t("main.missingInfoHint"));
      return;
    }
    if (!token) {
      Alert.alert(t("main.signInRequired"), t("main.signInAdmin"));
      return;
    }

    savingRef.current = true;
    onSavingChange(true);
    const url = isNew ? `${apiBase}/api/admin/models` : `${apiBase}/api/admin/models/${id}`;
    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: adminHeaders,
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          code: formCode.trim(),
          baseUrl: formBaseUrl.trim(),
          // Khong gui key rong: server giu nguyen key cu khi khong co apiKey
          ...(formApiKey.trim() ? { apiKey: formApiKey.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(t("main.cannotSave"), data.error ? mainInterfaceError(String(data.error), t) : t("main.serverStatus", { value: res.status }));
        return;
      }
      if (isNew) setModel(data.model.code);
      onSavingChange(false);
      savingRef.current = false;
      onClose();
      reloadAdminModels();
      reloadModels();
    } catch (err: any) {
      Alert.alert(t("main.networkError"), err.message ? mainInterfaceError(String(err.message), t) : t("main.tryAgain"));
    } finally {
      savingRef.current = false;
      onSavingChange(false);
    }
  };

  const testMessage = keyTest.state === "ok" ? t("main.testSuccess", { value: keyTest.sample })
    : keyTest.state !== "fail" ? ""
    : keyTest.reason === "missingId" ? t("main.testNeedsId")
    : keyTest.reason === "http" ? t("main.httpError", { value: keyTest.detail })
    : keyTest.detail ? mainInterfaceError(String(keyTest.detail), t) : t("main.tryAgain");

  return (
    <>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <StitchIcon name="memory" size={20} color={ACCENT} />
          <Text allowFontScaling={false} style={styles.sectionTitle}>{t(isNew ? "main.newModel" : "main.editModel")}</Text>
        </View>

    <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingVertical: 8, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
      <View style={styles.modelFormGroup}>
      <View>
          <Text allowFontScaling={false} style={styles.inputLabel}>{t("main.displayName")}</Text>
          <TextInput
            allowFontScaling={false}
            editable={!saving}
            style={styles.input}
            value={formName}
            onChangeText={setFormName}
            accessibilityLabel={t("main.displayName")}
            placeholder={t("main.nameExample")}
            placeholderTextColor={TEXT_MUTED}
          />
        </View>

        <View>
          <Text allowFontScaling={false} style={styles.inputLabel}>{t("main.modelId")}</Text>
          <TextInput
            allowFontScaling={false}
            editable={!saving}
            style={styles.input}
            value={formCode}
            onChangeText={setFormCode}
            accessibilityLabel={t("main.modelId")}
            placeholder={t("main.idExample")}
            placeholderTextColor={TEXT_MUTED}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View>
          <Text allowFontScaling={false} style={styles.inputLabel}>{t("main.optionalDescription")}</Text>
          <TextInput allowFontScaling={false} editable={!saving} style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} value={formDescription} onChangeText={setFormDescription} multiline maxLength={500} placeholder={t("main.descriptionExample")} placeholderTextColor={TEXT_MUTED} accessibilityLabel={t("main.description")} />
          <Text allowFontScaling={false} style={styles.caption}>{t("main.characterCount", { value: formDescription.length })}</Text>
        </View>

        <View>
          <Text allowFontScaling={false} style={styles.inputLabel}>{t("main.baseUrl")}</Text>
          <TextInput
            allowFontScaling={false}
            editable={!saving}
            style={styles.input}
            value={formBaseUrl}
            onChangeText={setFormBaseUrl}
            accessibilityLabel={t("main.baseUrl")}
            placeholder={t("main.urlExample")}
            placeholderTextColor={TEXT_MUTED}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text allowFontScaling={false} style={styles.hint}>{t("main.baseUrlHint")}</Text>
        </View>

        <View>
          <Text allowFontScaling={false} style={styles.inputLabel}>{t(isNew ? "main.apiKeyRequired" : "main.apiKeyEdit")}</Text>
          <TextInput
            allowFontScaling={false}
            editable={!saving}
            style={styles.input}
            value={formApiKey}
            onChangeText={setFormApiKey}
            accessibilityLabel={t(isNew ? "main.apiKeyRequired" : "main.apiKeyEdit")}
            placeholder="sk-..."
            placeholderTextColor={TEXT_MUTED}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!isNew ? <Text allowFontScaling={false} style={styles.hint}>{t("main.apiKeyHint")}</Text> : null}
        </View>

        <Pressable style={styles.verifyBtn} onPress={handleTest} disabled={saving || keyTest.state === "loading"}>
          <Text allowFontScaling={false} style={styles.verifyBtnText}>{t(keyTest.state === "loading" ? "main.testing" : "main.verify")}</Text>
        </Pressable>
        {keyTest.state === "ok" || keyTest.state === "fail" ? (
          <Text allowFontScaling={false} style={[styles.hint, { color: keyTest.state === "ok" ? ACCENT : DANGER }]}>{testMessage}</Text>
        ) : null}

        <Text allowFontScaling={false} style={styles.hint}>{t("main.serverTestHint")}</Text>

        <View style={styles.formFooter}>
          <Pressable style={styles.cancelBtn} disabled={saving} onPress={onClose}>
            <Text allowFontScaling={false} style={styles.cancelBtnText}>{t("main.cancel")}</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} disabled={saving || keyTest.state === "loading"} onPress={handleSave}>
            {saving ? <ActivityIndicator /> : null}
            <Text allowFontScaling={false} style={styles.saveBtnText}>{t(saving ? "main.saving" : "main.saveModel")}</Text>
          </Pressable>
        </View>
      </View>
      </ScrollView>
    </>
  );
}
