import { useCallback } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSettings } from "../lib/settings";
import { styles } from "../lib/theme";

export default function ModelsPanel({ onOpenForm }: { onOpenForm: (id: string) => void }) {
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

  return (
    <>
      {/* Header quan ly model */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Quản lý Model AI</Text>
            <Text style={styles.hint}>Tự cấu hình Base URL và API Key riêng cho từng model</Text>
          </View>
          <Pressable style={styles.primaryBtn} accessibilityRole="button" onPress={() => onOpenForm("new")}>
            <Text style={styles.primaryBtnText}>+ Thêm Model</Text>
          </Pressable>
        </View>
      </View>

      {/* Danh sach model tren server */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Model trên server</Text>
        {adminModelsLoading ? (
          <View style={styles.rowBetween}>
            <ActivityIndicator />
            <Text style={styles.hint}>{customModels.length ? "Đang cập nhật..." : "Đang tải danh sách..."}</Text>
          </View>
        ) : null}
        {adminModelsError ? (
          <View>
            <Text style={styles.hint}>{adminModelsError}</Text>
            <Pressable onPress={reloadAdminModels} disabled={adminModelsLoading} accessibilityRole="button">
              <Text style={styles.actionBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}
        {customModels.length === 0 ? (!adminModelsLoading && !adminModelsError ? (
          <Text style={styles.emptyText}>
            {adminKey.trim()
              ? 'Server chưa có model nào. Nhấn "+ Thêm Model" để tạo.'
              : "Nhập ADMIN_KEY trong tab Cài đặt để xem và sửa danh sách model trên server."}
          </Text>
        ) : null) : (
          customModels.map((item) => {
            const isSelected = model === item.code;
            const isDeleting = deletingIds.includes(item.id);
            return (
              <View key={item.id} style={[styles.modelCardItem, isSelected && styles.modelCardSelected]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modelNameText}>{item.name}</Text>
                    <Text style={styles.modelCodeText}>Mã: {item.code}</Text>
                    <Text style={styles.modelUrlText}>URL: {item.baseUrl || "(Mặc định của server)"}</Text>
                    <Text style={styles.modelUrlText}>Key: {item.apiKey || "(Không có)"}</Text>
                  </View>
                  {isSelected ? (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Đang dùng</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.modelActionsRow}>
                  <Pressable style={styles.actionBtn} disabled={isDeleting} accessibilityRole="button" onPress={() => onOpenForm(item.id)}>
                    <Text style={styles.actionBtnText}>✏ Sửa</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnAccent]}
                    accessibilityRole="button"
                    disabled={isDeleting}
                    onPress={() => setModel(item.code)}
                  >
                    <Text style={styles.actionBtnAccentText}>✓ Dùng</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtnDanger} disabled={isDeleting} accessibilityRole="button" onPress={() => handleDelete(item.id, item.name)}>
                    {isDeleting ? <ActivityIndicator /> : null}
                    <Text style={styles.actionBtnDangerText}>{isDeleting ? "Đang xóa..." : "✕ Xóa"}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Model he thong ma server tra ve cho app */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Model hệ thống</Text>
        <Text style={styles.hint}>Model server đang bật cho app chọn, cấu hình key nằm trên server.</Text>
      </View>
    </>
  );
}
