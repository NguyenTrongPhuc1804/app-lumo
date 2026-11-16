import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { parseAuthLink } from "../lib/auth-link";
import { decideAuthAction } from "../lib/auth-route";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../hooks/useTheme";

// Man trung gian: server chuyen ve day kem ?token= hoac ?error=.
// Luu token roi thay the route bang trang chu, de bam back khong quay lai day.
export default function AuthCallbackScreen() {
  const { styles } = useTheme();
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const [message, setMessage] = useState("Đang hoàn tất đăng nhập…");
  // Chan chay hai lan khi React StrictMode hoac deep link mo lap lai.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const action = decideAuthAction(parseAuthLink(`lumolens://auth?token=${params.token ?? ""}&error=${params.error ?? ""}`));

    if (action.type === "login") {
      completeLogin(action.token)
        .then(() => router.replace(action.target))
        .catch((err: any) => {
          setMessage(err?.message ?? "Không tải được thông tin tài khoản.");
          router.replace("/login");
        });
      return;
    }

    setMessage(action.message ?? "Đăng nhập không hoàn tất.");
    router.replace("/login");
  }, [completeLogin, params.error, params.token]);

  return (
    <View style={[styles.container, { alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }]}>
      <ActivityIndicator size="large" />
      <Text allowFontScaling={false} style={styles.hint}>{message}</Text>
    </View>
  );
}
