import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSettings } from "../lib/settings";
import { TEXT_MUTED, styles } from "../lib/theme";
import ScreenTranslator from "../modules/screen-translator";

export default function SettingsPanel() {
  const { serverUrl, setServerUrl, adminKey, setAdminKey, hasOverlayPermission, reloadModels, modelsLoading, modelsError } = useSettings();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quyền hiển thị trên ứng dụng khác</Text>
        {hasOverlayPermission ? (
          <Text style={styles.ok}>Đã cấp quyền</Text>
        ) : (
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => ScreenTranslator.openOverlaySettings()}>
            <Text style={styles.secondaryButtonText}>Mở cài đặt để cấp quyền</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Địa chỉ server</Text>
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
        <Text style={styles.hint}>Máy ảo Android dùng 10.0.2.2. Điện thoại thật dùng IP máy tính trong cùng mạng Wi-Fi.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Khoá quản trị (ADMIN_KEY)</Text>
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
