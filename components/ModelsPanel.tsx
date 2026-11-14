import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { filterModels } from "../lib/model-search";
import { useFocusEffect } from "expo-router";
import { useSettings } from "../lib/settings";
import { useAppearance } from "../lib/appearance";
import StitchIcon from "./StitchIcon";

export default function ModelsPanel({ onOpenForm }: { onOpenForm: (id: string) => void }) {
  const { styles, ACCENT, ACCENT_ON, DANGER, TEXT_DIM, TEXT_MUTED } = useAppearance();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { adminKey, model, customModels, setModel, reloadModels, reloadAdminModels, adminModelsLoading, adminModelsError, deletingIds, removeModel } = useSettings();

  // Moi lan vao tab thi lay lai danh sach moi nhat tu server
  useFocusEffect(
    useCallback(() => {
      reloadAdminModels();
      reloadModels();
    }, [reloadAdminModels, reloadModels])
  );

  // Xoa model tren server
  const handleDelete = (id: string, name: string) => {
    Alert.alert("Xác nhận xóa", `Bạn có chắc muốn xóa model "${name}" khỏi server?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const error = await removeModel(id);
          if (error) Alert.alert("Không xóa được", error);
        },
      },
    ]);
  };

  const visibleModels = filterModels(customModels, query);
  return (
    <>
      <View style={styles.modelSearch}>
        <StitchIcon name="memory" size={20} color={TEXT_MUTED} />
        <TextInput allowFontScaling={false} style={[styles.modelSearchInput, { color: TEXT_DIM }]} value={query} onChangeText={setQuery} placeholder="Tìm kiếm model AI…" placeholderTextColor={TEXT_MUTED} accessibilityLabel="Tìm kiếm model AI" />
        {query ? <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" style={styles.compactIconButton}><StitchIcon name="refresh" size={20} color={TEXT_MUTED} /></Pressable> : null}
      </View>

      {/* Danh sach model tren server */}
      <View style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>Model AI ({visibleModels.length})</Text>
          {customModels.some((item) => item.code === model) ? <View style={styles.activeBadge}><Text allowFontScaling={false} style={styles.activeBadgeText}>1 đang dùng</Text></View> : null}
        </View>
        {adminModelsLoading ? (
          <View style={styles.rowBetween}>
            <ActivityIndicator />
            <Text allowFontScaling={false} style={styles.hint}>{customModels.length ? "Đang cập nhật..." : "Đang tải danh sách..."}</Text>
          </View>
        ) : null}
        {adminModelsError ? (
          <View>
            <Text allowFontScaling={false} style={styles.hint}>{adminModelsError}</Text>
            <Pressable onPress={reloadAdminModels} disabled={adminModelsLoading} accessibilityRole="button">
              <Text allowFontScaling={false} style={styles.actionBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}
        {customModels.length === 0 ? (!adminModelsLoading && !adminModelsError ? (
          <Text allowFontScaling={false} style={styles.emptyText}>
            {adminKey.trim()
              ? 'Server chưa có model nào. Nhấn "+ Thêm Model" để tạo.'
              : "Nhập ADMIN_KEY trong tab Cài đặt để xem và sửa danh sách model trên server."}
          </Text>
        ) : null) : (
          visibleModels.map((item) => {
            const isSelected = model === item.code;
            const isDeleting = deletingIds.includes(item.id);
            const expanded = expandedId === item.id || (expandedId === null && isSelected);
            return (
              <View key={item.id} style={[styles.modelCardItem, isSelected && styles.modelCardSelected]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${expanded ? "Thu gọn" : "Xem chi tiết"} ${item.name}`} accessibilityState={{ expanded }} style={styles.modelSummary} onPress={() => setExpandedId(expanded ? "" : item.id)}>
                    <View style={[styles.modelGlyph, isSelected && styles.actionBtnAccent]}><StitchIcon name="memory" size={23} color={isSelected ? ACCENT_ON : ACCENT} /></View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text allowFontScaling={false} style={styles.modelNameText}>{item.name}</Text>
                      <Text allowFontScaling={false} style={styles.modelCodeText}>{item.code}</Text>
                    </View>
                    <StitchIcon name="expand_more" size={20} color={TEXT_MUTED} />
                  </Pressable>
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: isSelected, disabled: isDeleting }} accessibilityLabel={`Dùng ${item.name}`} disabled={isDeleting} onPress={() => setModel(item.code)} style={styles.compactIconButton}>
                    <View style={[styles.modelRadio, isSelected && styles.actionBtnAccent]}>{isSelected ? <StitchIcon name="check" size={18} color={ACCENT_ON} /> : null}</View>
                  </Pressable>
                </View>
                {isSelected ? <View style={[styles.activeBadge, { alignSelf: "flex-start" }]}><Text allowFontScaling={false} style={styles.activeBadgeText}>Đang dùng</Text></View> : null}
                {expanded ? <>
                <View style={styles.modelDetails}>
                  {item.description ? <Text allowFontScaling={false} style={styles.hint}>{item.description}</Text> : null}
                  <Text allowFontScaling={false} style={styles.modelUrlText}>{item.baseUrl || "Base URL mặc định của server"}</Text>
                </View>

                <View style={styles.modelActionsRow}>
                  <Pressable style={styles.actionBtn} disabled={isDeleting} accessibilityRole="button" accessibilityLabel={`Chỉnh sửa ${item.name}`} onPress={() => onOpenForm(item.id)}>
                    <View style={styles.iconLabel}><StitchIcon name="edit" size={18} color={TEXT_DIM} /><Text allowFontScaling={false} style={styles.actionBtnText}>Sửa</Text></View>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnAccent]}
                    accessibilityRole="button"
                    disabled={isDeleting}
                    onPress={() => setModel(item.code)}
                  >
                    <View style={styles.iconLabel}><StitchIcon name="check" size={18} color={ACCENT_ON} /><Text allowFontScaling={false} style={styles.actionBtnAccentText}>Dùng</Text></View>
                  </Pressable>
                  <Pressable style={styles.actionBtnDanger} disabled={isDeleting} accessibilityRole="button" onPress={() => handleDelete(item.id, item.name)}>
                    <View style={styles.iconLabel}>
                      {isDeleting ? <ActivityIndicator /> : <StitchIcon name="delete" size={18} color={DANGER} />}
                      <Text allowFontScaling={false} style={styles.actionBtnDangerText}>{isDeleting ? "Đang xóa..." : "Xóa"}</Text>
                    </View>
                  </Pressable>
                </View>
                </> : null}
              </View>
            );
          })
        )}
      </View>

      {customModels.length > 0 && visibleModels.length === 0 ? <View style={styles.card}><Text allowFontScaling={false} style={styles.hint}>Không tìm thấy model phù hợp. Thử tên, mã hoặc mô tả khác.</Text></View> : null}
    </>
  );
}
