import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_DEEP_LINK, describeAuthError, parseAuthLink } from "../lib/auth-link";
import { decideAuthAction } from "../lib/auth-route";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "../components/StitchIcon";
import { GoogleMark, FacebookMark } from "../components/BrandMarks";

// Mo trang dang nhap cua server trong trinh duyet he thong.
// Server tu chuyen sang Google roi quay ve app qua deep link.
function authUrl(serverUrl: string, provider: "google" | "facebook") {
  return `${serverUrl.trim().replace(/\/+$/, "")}/api/auth/${provider}/start`;
}

const PERKS = [
  "Đồng bộ cấu hình model và hạn mức dịch trên mọi thiết bị",
  "Token lưu trong kho bảo mật của máy, không lưu mật khẩu",
  "Dùng nút dịch nổi trên mọi ứng dụng, không cần chuyển app",
];

export default function LoginScreen() {
  const { styles, ACCENT } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ error?: string }>();
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const error = useAuthStore((s) => s.error);
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const [opening, setOpening] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = useRef(false);

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
    if (!serverUrl.trim()) {
      Alert.alert("Chưa cấu hình server", "Đăng nhập cần địa chỉ server. Cài đặt trong mã nguồn trước khi build, hoặc liên hệ quản trị viên.");
      return;
    }

    busy.current = true;
    setOpening(true);
    setLocalError(null);
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl(serverUrl, provider), AUTH_DEEP_LINK);

      // Custom Tab có thể đóng mà router không bắt được deep link, nên đọc URL trả về luôn.
      if (result.type === "success" && result.url) {
        const action = decideAuthAction(parseAuthLink(result.url));
        if (action.type === "login") {
          await completeLogin(action.token);
          router.replace(action.target);
          return;
        }
        setLocalError(action.message);
        return;
      }

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
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
      {/* Thanh thuong hieu: logo, ten hai mau, pill trang thai */}
      <View style={styles.loginHeader}>
        <View style={styles.loginBrandRow}>
          <View style={styles.loginLogo}>
            <Image source={require("../assets/logo.png")} style={{ width: 30, height: 30 }} resizeMode="contain" />
          </View>
          <Text allowFontScaling={false} style={styles.loginBrandName}>
            Lumo<Text allowFontScaling={false} style={styles.loginBrandAccent}>Lens</Text>
          </Text>
        </View>
        <View style={styles.syncPill}>
          <View style={styles.syncPillDot} />
          <Text allowFontScaling={false} style={styles.syncPillText}>SYNC</Text>
        </View>
      </View>

      {/* The hero theo dung cau truc Stitch */}
      <View style={styles.loginHeroCard}>
        <View style={styles.loginHeroTop}>
          <View style={styles.loginHeroKicker}>
            <View style={styles.loginHeroDot} />
            <Text allowFontScaling={false} style={styles.loginHeroKickerText}>LUMO CLOUD KEYRING</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text allowFontScaling={false} style={styles.activeBadgeText}>HOẠT ĐỘNG</Text>
          </View>
        </View>
        <View style={styles.loginHeroBody}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text allowFontScaling={false} style={styles.loginTitle}>Chào mừng trở lại</Text>
            <Text allowFontScaling={false} style={styles.loginSubtitle}>
              Đồng bộ cấu hình model, hạn mức dịch và từ vựng đã dịch tức thì.
            </Text>
          </View>
          <View style={styles.loginHeroIcon}>
            <StitchIcon name="crop_free" size={22} color={ACCENT} />
          </View>
        </View>
      </View>

      {message ? (
        <View style={styles.infoBox}>
          <Text allowFontScaling={false} style={styles.hint}>{message}</Text>
        </View>
      ) : null}

      {/* The dang nhap: hai nut xep doc, duong ke, ghi chu bao mat */}
      <View style={styles.loginCard}>
        <Pressable
          style={styles.socialButton}
          accessibilityRole="button"
          accessibilityLabel="Đăng nhập bằng Google"
          accessibilityState={{ disabled: opening }}
          disabled={opening}
          onPress={() => startLogin("google")}
        >
          <View style={styles.socialMarkBox}><GoogleMark size={20} /></View>
          <Text allowFontScaling={false} style={styles.socialButtonText}>{opening ? "Đang mở trình duyệt…" : "Tiếp tục với Google"}</Text>
        </Pressable>

        <Pressable
          style={[styles.socialButton, styles.socialButtonFacebook, { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel="Đăng nhập bằng Facebook, sắp có"
          onPress={() => startLogin("facebook")}
        >
          <View style={styles.socialMarkBox}><FacebookMark size={18} /></View>
          <Text allowFontScaling={false} style={styles.socialButtonTextOnColor}>Facebook (sắp có)</Text>
        </Pressable>

        <View style={styles.loginOrRow}>
          <View style={styles.loginOrLine} />
          <Text allowFontScaling={false} style={styles.loginOrText}>Hoặc tiếp tục với</Text>
          <View style={styles.loginOrLine} />
        </View>

        <View style={styles.securityRow}>
          <StitchIcon name="key" size={16} color={ACCENT} />
          <Text allowFontScaling={false} style={[styles.perkText, { flex: 1 }]}>
            Không lưu mật khẩu. Email và tên do Google xác thực, token lưu trong kho bảo mật của máy.
          </Text>
        </View>
      </View>

      {/* The quyen loi giong Stitch */}
      <View style={styles.perksCard}>
        <View style={styles.perksTitleRow}>
          <StitchIcon name="layers" size={15} color="#047857" />
          <Text allowFontScaling={false} style={styles.perksTitle}>Quyền lợi tài khoản Lumo Sync</Text>
        </View>
        {PERKS.map((text) => (
          <View key={text} style={styles.perkRow}>
            <View style={styles.perkDot} />
            <Text allowFontScaling={false} style={styles.perkText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Footer dieu khoan */}
      <View style={styles.legalBar}>
        <Text allowFontScaling={false} style={styles.legalText}>
          Bằng việc tiếp tục, bạn đồng ý với
          <Text allowFontScaling={false} style={styles.legalLink}> Điều khoản</Text> và
          <Text allowFontScaling={false} style={styles.legalLink}> Chính sách AI Ethics</Text> của Lumo Lens.
        </Text>
      </View>
    </ScrollView>
  );
}
