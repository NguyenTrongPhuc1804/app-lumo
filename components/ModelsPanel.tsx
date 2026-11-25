import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { filterModels } from "../lib/model-search";
import { useFocusEffect } from "expo-router";
import { useConfigStore } from "../stores/configStore";
import { useModelStore } from "../stores/modelStore";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "react-i18next";
import { mainInterfaceError } from "../lib/main-interface-labels";
import StitchIcon from "./StitchIcon";

export default function ModelsPanel({ onOpenForm }: { onOpenForm: (id: string) => void }) {
  const { styles, ACCENT, ACCENT_ON, DANGER, TEXT_DIM, TEXT_MUTED } = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const model = useConfigStore((s) => s.model);
  const setModel = useConfigStore((s) => s.setModel);
  const customModels = useModelStore((s) => s.customModels);
  const reloadModels = useModelStore((s) => s.reloadModels);
  const reloadAdminModels = useModelStore((s) => s.reloadAdminModels);
  const adminModelsLoading = useModelStore((s) => s.adminModelsLoading);
  const adminModelsError = useModelStore((s) => s.adminModelsError);
  const deletingIds = useModelStore((s) => s.deletingIds);
  const removeModel = useModelStore((s) => s.removeModel);

  // Moi lan vao tab thi lay lai danh sach moi nhat tu server
  useFocusEffect(
    useCallback(() => {
      reloadAdminModels();
      reloadModels();
    }, [reloadAdminModels, reloadModels])
  );

  // Xoa model tren server
  const handleDelete = (id: string, name: string) => {
    Alert.alert(t("main.confirmDelete"), t("main.deleteQuestion", { value: name }), [
      { text: t("main.cancel"), style: "cancel" },
      {
        text: t("main.delete"),
        style: "destructive",
        onPress: async () => {
          const error = await removeModel(id);
          if (error) Alert.alert(t("main.deleteFailed"), mainInterfaceError(error, t));
        },
      },
    ]);
  };

  const visibleModels = filterModels(customModels, query);
  return (
    <>
      <View style={styles.modelSearch}>
        <StitchIcon name="memory" size={20} color={TEXT_MUTED} />
        <TextInput allowFontScaling={false} style={[styles.modelSearchInput, { color: TEXT_DIM }]} value={query} onChangeText={setQuery} placeholder={`${t("main.search")}…`} placeholderTextColor={TEXT_MUTED} accessibilityLabel={t("main.search")} />
        {query ? <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel={t("main.clearSearch")} style={styles.compactIconButton}><StitchIcon name="refresh" size={20} color={TEXT_MUTED} /></Pressable> : null}
      </View>

      {/* Danh sach model tren server */}
      <View style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>{t("main.modelCount", { value: visibleModels.length })}</Text>
          {customModels.some((item) => item.code === model) ? <View style={styles.activeBadge}><Text allowFontScaling={false} style={styles.activeBadgeText}>{t("main.oneActive")}</Text></View> : null}
        </View>
        {adminModelsLoading ? (
          <View style={styles.rowBetween}>
            <ActivityIndicator />
            <Text allowFontScaling={false} style={styles.hint}>{t(customModels.length ? "main.updatingModels" : "main.loadingModels")}</Text>
          </View>
        ) : null}
        {adminModelsError ? (
          <View>
            <Text allowFontScaling={false} style={styles.hint}>{mainInterfaceError(adminModelsError, t)}</Text>
            <Pressable onPress={reloadAdminModels} disabled={adminModelsLoading} accessibilityRole="button">
              <Text allowFontScaling={false} style={styles.actionBtnText}>{t("main.retry")}</Text>
            </Pressable>
          </View>
        ) : null}
        {customModels.length === 0 ? (!adminModelsLoading && !adminModelsError ? (
          <Text allowFontScaling={false} style={styles.emptyText}>
            {t("main.emptyModels")}
          </Text>
        ) : null) : (
          visibleModels.map((item) => {
            const isSelected = model === item.code;
            const isDeleting = deletingIds.includes(item.id);
            const expanded = expandedId === item.id || (expandedId === null && isSelected);
            return (
              <View key={item.id} style={[styles.modelCardItem, isSelected && styles.modelCardSelected]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={t(expanded ? "main.collapse" : "main.expand", { value: item.name })} accessibilityState={{ expanded }} style={styles.modelSummary} onPress={() => setExpandedId(expanded ? "" : item.id)}>
                    <View style={[styles.modelGlyph, isSelected && styles.actionBtnAccent]}><StitchIcon name="memory" size={23} color={isSelected ? ACCENT_ON : ACCENT} /></View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text allowFontScaling={false} style={styles.modelNameText}>{item.name}</Text>
                      <Text allowFontScaling={false} style={styles.modelCodeText}>{item.code}</Text>
                    </View>
                    <StitchIcon name="expand_more" size={20} color={TEXT_MUTED} />
                  </Pressable>
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: isSelected, disabled: isDeleting }} accessibilityLabel={t("main.useModel", { value: item.name })} disabled={isDeleting} onPress={() => setModel(item.code)} style={styles.compactIconButton}>
                    <View style={[styles.modelRadio, isSelected && styles.actionBtnAccent]}>{isSelected ? <StitchIcon name="check" size={18} color={ACCENT_ON} /> : null}</View>
                  </Pressable>
                </View>
                {isSelected ? <View style={[styles.activeBadge, { alignSelf: "flex-start" }]}><Text allowFontScaling={false} style={styles.activeBadgeText}>{t("main.active")}</Text></View> : null}
                {expanded ? <>
                <View style={styles.modelDetails}>
                  {item.description ? <Text allowFontScaling={false} style={styles.hint}>{item.description}</Text> : null}
                  <Text allowFontScaling={false} style={styles.modelUrlText}>{item.baseUrl || t("main.defaultBaseUrl")}</Text>
                </View>

                <View style={styles.modelActionsRow}>
                  <Pressable style={styles.actionBtn} disabled={isDeleting} accessibilityRole="button" accessibilityLabel={t("main.editNamedModel", { value: item.name })} onPress={() => onOpenForm(item.id)}>
                    <View style={styles.iconLabel}><StitchIcon name="edit" size={18} color={TEXT_DIM} /><Text allowFontScaling={false} style={styles.actionBtnText}>{t("main.edit")}</Text></View>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnAccent]}
                    accessibilityRole="button"
                    disabled={isDeleting}
                    onPress={() => setModel(item.code)}
                  >
                    <View style={styles.iconLabel}><StitchIcon name="check" size={18} color={ACCENT_ON} /><Text allowFontScaling={false} style={styles.actionBtnAccentText}>{t("main.use")}</Text></View>
                  </Pressable>
                  <Pressable style={styles.actionBtnDanger} disabled={isDeleting} accessibilityRole="button" onPress={() => handleDelete(item.id, item.name)}>
                    <View style={styles.iconLabel}>
                      {isDeleting ? <ActivityIndicator /> : <StitchIcon name="delete" size={18} color={DANGER} />}
                      <Text allowFontScaling={false} style={styles.actionBtnDangerText}>{t(isDeleting ? "main.deleting" : "main.delete")}</Text>
                    </View>
                  </Pressable>
                </View>
                </> : null}
              </View>
            );
          })
        )}
      </View>

      {customModels.length > 0 && visibleModels.length === 0 ? <View style={styles.card}><Text allowFontScaling={false} style={styles.hint}>{t("main.noSearchResults")}</Text></View> : null}
    </>
  );
}
