import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSettings } from "../lib/settings";
import { ACCENT, TEXT_MUTED, styles } from "../lib/theme";
import StitchIcon from "./StitchIcon";

import ScreenTranslator from "../modules/screen-translator";

export default function SettingsPanel() {
  const { serverUrl, setServerUrl, adminKey, setAdminKey, hasOverlayPermission, reloadModels, modelsLoading, modelsError } = useSettings();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.pageTitle}>Cài đặt hệ thống</Text>
        <Text style={styles.hint}>Quản lý quyền, kết nối và cấu hình quản trị.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quyền hệ thống</Text>
        <View style={styles.iconLabel}><StitchIcon name="layers" color={ACCENT} /><Text style={[styles.sectionTitle, { flex: 1 }]}>Hiển thị trên ứng dụng khác</Text></View>
        {hasOverlayPermission ? (
          <Text style={styles.ok}>Đã cấp quyền</Text>
        ) : (
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => ScreenTranslator.openOverlaySettings()}>
            <Text style={styles.secondaryButtonText}>Mở cài đặt để cấp quyền</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.caption}>Kết nối</Text>
        <View style={styles.iconLabel}><StitchIcon name="dns" color={ACCENT} /><Text style={styles.sectionTitle}>Địa chỉ server</Text></View>
        <TextInput
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
        {modelsLoading ? <View style={styles.rowBetween}><ActivityIndicator /><Text style={styles.hint}>Đang tải danh sách model...</Text></View> : null}
        {modelsError ? <View><Text style={styles.hint}>{modelsError}</Text><Pressable disabled={modelsLoading} onPress={reloadModels}><Text style={styles.actionBtnText}>Thử lại</Text></Pressable></View> : null}
        <Pressable style={styles.secondaryButton} accessibilityRole="button" disabled={modelsLoading} onPress={reloadModels}>
          <View style={styles.iconLabel}><StitchIcon name="speed" size={20} color={ACCENT} /><Text style={styles.secondaryButtonText}>{modelsLoading ? "Đang kiểm tra..." : "Kiểm tra kết nối"}</Text></View>
        </Pressable>
        <View style={styles.infoBox}>
          <Text style={styles.hint}>Máy ảo Android dùng 10.0.2.2. Điện thoại thật dùng IP máy tính trong cùng mạng Wi-Fi.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.caption}>Quản trị</Text>
        <View style={styles.iconLabel}><StitchIcon name="key" color={ACCENT} /><Text style={[styles.sectionTitle, { flex: 1 }]}>Khoá quản trị (ADMIN_KEY)</Text></View>
        <TextInput
          style={styles.input}
          value={adminKey}
          onChangeText={setAdminKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="Nhập ADMIN_KEY của server"
          placeholderTextColor={TEXT_MUTED}
          accessibilityLabel="Khoá quản trị ADMIN_KEY"
        />
        <Text style={styles.hint}>Phải trùng ADMIN_KEY trong .env của server. Dùng để thêm, sửa, xóa model.</Text>
      </View>
    </ScrollView>
  );
}
