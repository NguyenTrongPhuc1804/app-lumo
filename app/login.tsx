import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { describeAuthError } from "../lib/auth-link";
import { AUTH_DEEP_LINK } from "../lib/auth-link";
import { useConfigStore } from "../stores/configStore";
import { decideAuthAction } from "../lib/auth-route";
import { parseAuthLink } from "../lib/auth-link";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "../components/StitchIcon";

// Mo trang dang nhap cua server trong trinh duyet he thong.
// Server se tu chuyen sang Google roi quay ve app qua deep link.
function authUrl(serverUrl: string, provider: "google" | "facebook") {
  return `${serverUrl.trim().replace(/\/+$/, "")}/api/auth/${provider}/start`;
}

export default function LoginScreen() {
  const { styles, ACCENT, TEXT_MUTED } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ error?: string }>();
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const setServerUrl = useConfigStore((s) => s.setServerUrl);
  const error = useAuthStore((s) => s.error);
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const [opening, setOpening] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(serverUrl);
  const busy = useRef(false);

  // Ghi địa chỉ server đã sửa vào store. Gọi khi rời ô nhập để không ghi mỗi lần gõ.
  const commitServerUrl = () => setServerUrl(serverUrlInput.trim());

  // Thong bao loi tu deep link hoac tu lan dang nhap truoc
  const [localError, setLocalError] = useState<string | null>(null);
  const message = localError ?? describeAuthError(params.error ?? null) ?? error;

  useEffect(() => {
    // Server da tra loi bang deep link; o day khong lam gi them.
  }, []);

  const startLogin = async (provider: "google" | "facebook") => {
    if (busy.current) return;
    if (provider === "facebook") {
      Alert.alert("Sắp có", "Đăng nhập Facebook sẽ được bật sau. Hiện tại hãy dùng Google.");
      return;
    }
    if (!serverUrlInput.trim()) {
      Alert.alert("Thiếu địa chỉ server", "Nhập địa chỉ server ở cuối màn hình trước khi đăng nhập.");
      return;
    }
    commitServerUrl();

    busy.current = true;
    setOpening(true);
    setLocalError(null);
    try {
      // openAuthSessionAsync tu dong dong trinh duyet khi app duoc mo lai bang deep link.
      const result = await WebBrowser.openAuthSessionAsync(authUrl(serverUrlInput, provider), AUTH_DEEP_LINK);

      // Truong hop Custom Tab tu dong dong nhung deep link khong duoc router bat:
      // doc token ngay tu URL tra ve de nguoi dung khong bi quay lai man hinh trong.
      if (result.type === "success" && result.url) {
        const link = parseAuthLink(result.url);
        const action = decideAuthAction(link);
        if (action.type === "login") {
          await completeLogin(action.token);
          router.replace(action.target);
          return;
        }
        setLocalError(action.message);
        return;
      }

      // Nguoi dung tu dong trinh duyet thi bao ro, khong im lang.
      if (result.type === "cancel" || result.type === "dismiss") {
        setLocalError("Bạn đã đóng trang đăng nhập. Thử lại khi sẵn sàng.");
      }
    } catch (err: any) {
      Alert.alert("Không mở được trình duyệt", err?.message ?? "Vui lòng thử lại.");
    } finally {
      busy.current = false;
      setOpening(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}>
      <View style={styles.headerBrand}>
        <Image source={require("../assets/logo.png")} style={styles.brandLogo} resizeMode="contain" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text allowFontScaling={false} style={styles.headerTitle}>Lumo Lens</Text>
          <Text allowFontScaling={false} style={styles.caption}>Dịch màn hình tức thì</Text>
        </View>
      </View>

      <View style={styles.loginHero}>
        <Text allowFontScaling={false} style={styles.loginTitle}>Chào mừng trở lại</Text>
        <Text allowFontScaling={false} style={styles.loginSubtitle}>
          Đăng nhập để đồng bộ cấu hình model, hạn mức dịch và dùng nút dịch nổi trên mọi ứng dụng.
        </Text>
      </View>

      {message ? (
        <View style={styles.infoBox}>
          <Text allowFontScaling={false} style={styles.hint}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Pressable
          style={styles.socialButton}
          accessibilityRole="button"
          accessibilityLabel="Đăng nhập bằng Google"
          accessibilityState={{ disabled: opening }}
          disabled={opening}
          onPress={() => startLogin("google")}
        >
          <View style={[styles.socialDot, { backgroundColor: "#4285F4" }]}>
            <Text allowFontScaling={false} style={[styles.socialButtonTextOnColor, { fontSize: 13 }]}>G</Text>
          </View>
          <Text allowFontScaling={false} style={styles.socialButtonText}>{opening ? "Đang mở trình duyệt…" : "Tiếp tục với Google"}</Text>
        </Pressable>

        <Pressable
          style={[styles.socialButton, styles.socialButtonFacebook, { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Đăng nhập bằng Facebook, sắp có"
          onPress={() => startLogin("facebook")}
        >
          <View style={[styles.socialDot, { backgroundColor: "#FFFFFF" }]}>
            <Text allowFontScaling={false} style={[styles.socialButtonText, { fontSize: 13 }]}>f</Text>
          </View>
          <Text allowFontScaling={false} style={styles.socialButtonTextOnColor}>Facebook (sắp có)</Text>
        </Pressable>

        <View style={styles.loginDivider}>
          <View style={styles.loginDividerLine} />
          <Text allowFontScaling={false} style={styles.caption}>Bảo mật</Text>
          <View style={styles.loginDividerLine} />
        </View>

        <View style={styles.iconLabel}>
          <StitchIcon name="key" size={18} color={ACCENT} />
          <Text allowFontScaling={false} style={[styles.hint, { flex: 1 }]}>
            Lumo Lens không lưu mật khẩu. Email và tên do Google xác thực, token lưu trong kho bảo mật của máy.
          </Text>
        </View>
      </View>

      <Text allowFontScaling={false} style={styles.legalText}>
        Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của Lumo Lens.
      </Text>

      {/* Cần địa chỉ server trước khi đăng nhập, nên cho nhập ngay tại đây */}
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>Địa chỉ server</Text>
        <TextInput
          allowFontScaling={false}
          style={styles.input}
          value={serverUrlInput}
          onChangeText={setServerUrlInput}
          onBlur={commitServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://your-domain.example"
          placeholderTextColor={TEXT_MUTED}
          accessibilityLabel="Địa chỉ server"
        />
        <Text allowFontScaling={false} style={styles.hint}>Đăng nhập cần domain HTTPS. Máy ảo Android dùng 10.0.2.2 khi chạy server trên máy tính.</Text>
      </View>
    </ScrollView>
  );
}
