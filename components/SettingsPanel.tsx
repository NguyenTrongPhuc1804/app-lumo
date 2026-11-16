import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useConfigStore } from "../stores/configStore";
import { useModelStore } from "../stores/modelStore";
import { useServiceStore } from "../stores/serviceStore";
import { useAppearanceStore } from "../stores/appearanceStore";
import type { TextSize } from "../lib/appearance-options";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "./StitchIcon";

import ScreenTranslator from "../modules/screen-translator";

export default function SettingsPanel() {
  const { styles, ACCENT, TEXT_MUTED } = useTheme();
  const colorMode = useAppearanceStore((s) => s.colorMode);
  const textSize = useAppearanceStore((s) => s.textSize);
  const setColorMode = useAppearanceStore((s) => s.setColorMode);
  const setTextSize = useAppearanceStore((s) => s.setTextSize);
  const storageError = useAppearanceStore((s) => s.storageError);
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const setServerUrl = useConfigStore((s) => s.setServerUrl);
  const hasOverlayPermission = useServiceStore((s) => s.hasOverlayPermission);
  const reloadModels = useModelStore((s) => s.reloadModels);
  const modelsLoading = useModelStore((s) => s.modelsLoading);
  const modelsError = useModelStore((s) => s.modelsError);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.pageTitle}>Cài đặt hệ thống</Text>
        <Text allowFontScaling={false} style={styles.hint}>Quản lý quyền, kết nối và cấu hình quản trị.</Text>
      </View>
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>Giao diện</Text>
        <Text allowFontScaling={false} style={styles.inputLabel}>Chế độ màu</Text>
        <View style={styles.modelActionsRow}>
          {(["light", "dark"] as const).map((mode) => (
            <Pressable key={mode} style={[styles.actionBtn, colorMode === mode && styles.actionBtnAccent]} accessibilityRole="radio" accessibilityState={{ checked: colorMode === mode }} onPress={() => setColorMode(mode)}>
              <Text allowFontScaling={false} style={colorMode === mode ? styles.actionBtnAccentText : styles.actionBtnText}>{mode === "light" ? "Sáng" : "Tối"}</Text>
            </Pressable>
          ))}
        </View>
        <Text allowFontScaling={false} style={styles.inputLabel}>Cỡ chữ trong app</Text>
        <View style={styles.modelActionsRow}>
          {([{ value: "auto", label: "Tự động" }, { value: "tiny", label: "Cực nhỏ" }, { value: "small", label: "Nhỏ" }, { value: "normal", label: "Tiêu chuẩn" }, { value: "large", label: "Lớn" }] satisfies { value: TextSize; label: string }[]).map((option) => (
            <Pressable key={option.value} style={[styles.actionBtn, textSize === option.value && styles.actionBtnAccent]} accessibilityRole="radio" accessibilityState={{ checked: textSize === option.value }} onPress={() => setTextSize(option.value)}>
              <Text allowFontScaling={false} style={textSize === option.value ? styles.actionBtnAccentText : styles.actionBtnText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.infoBox}><Text allowFontScaling={false} style={styles.sectionTitle}>Xem trước cỡ chữ</Text><Text allowFontScaling={false} style={styles.hint}>Tự động chọn theo chiều rộng màn hình. Không thay đổi chữ bản dịch nổi hay cỡ chữ Android.</Text></View>
        {storageError ? <Text allowFontScaling={false} style={styles.hint}>{storageError}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>Quyền hệ thống</Text>
        <View style={styles.iconLabel}><StitchIcon name="layers" color={ACCENT} /><Text allowFontScaling={false} style={[styles.sectionTitle, { flex: 1 }]}>Hiển thị trên ứng dụng khác</Text></View>
        {hasOverlayPermission ? (
          <Text allowFontScaling={false} style={styles.ok}>Đã cấp quyền</Text>
        ) : (
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => ScreenTranslator.openOverlaySettings()}>
            <Text allowFontScaling={false} style={styles.secondaryButtonText}>Mở cài đặt để cấp quyền</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.caption}>Kết nối</Text>
        <View style={styles.iconLabel}><StitchIcon name="dns" color={ACCENT} /><Text allowFontScaling={false} style={styles.sectionTitle}>Địa chỉ server</Text></View>
        <TextInput
          allowFontScaling={false}
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          onBlur={() => reloadModels()}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.1.10:3000"
          placeholderTextColor={TEXT_MUTED}
          accessibilityLabel="Địa chỉ server"
        />
        {modelsLoading ? <View style={styles.rowBetween}><ActivityIndicator /><Text allowFontScaling={false} style={styles.hint}>Đang tải danh sách model...</Text></View> : null}
        {modelsError ? <View><Text allowFontScaling={false} style={styles.hint}>{modelsError}</Text><Pressable disabled={modelsLoading} onPress={reloadModels}><Text allowFontScaling={false} style={styles.actionBtnText}>Thử lại</Text></Pressable></View> : null}
        <Pressable style={styles.secondaryButton} accessibilityRole="button" disabled={modelsLoading} onPress={reloadModels}>
          <View style={styles.iconLabel}><StitchIcon name="speed" size={20} color={ACCENT} /><Text allowFontScaling={false} style={styles.secondaryButtonText}>{modelsLoading ? "Đang kiểm tra..." : "Kiểm tra kết nối"}</Text></View>
        </Pressable>
        <View style={styles.infoBox}>
          <Text allowFontScaling={false} style={styles.hint}>Máy ảo Android dùng 10.0.2.2. Điện thoại thật dùng IP máy tính trong cùng mạng Wi-Fi.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.caption}>Tài khoản</Text>
        <View style={styles.iconLabel}><StitchIcon name="dns" color={ACCENT} /><Text allowFontScaling={false} style={[styles.sectionTitle, { flex: 1 }]}>Quản lý model</Text></View>
        <Text allowFontScaling={false} style={styles.hint}>Chỉ tài khoản quản trị mới thấy tab Model AI và thêm, sửa, xoá được model. Không còn dùng ADMIN_KEY trong app.</Text>
      </View>
    </ScrollView>
  );
}
