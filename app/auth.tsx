import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { authErrorKey, withErrorDetail } from "../lib/auth-account-format";
import { decideAuthAction } from "../lib/auth-route";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../hooks/useTheme";
// Man trung gian: server chuyen ve day kem ?token= hoac ?error=.
// Luu token roi thay the route bang trang chu, de bam back khong quay lai day.
export default function AuthCallbackScreen() {
  const { styles } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const [accountFailure, setAccountFailure] = useState<{ detail?: string } | null>(null);
  // Chan chay hai lan khi React StrictMode hoac deep link mo lap lai.
  const handled = useRef(false);
  const errorKey = !params.token ? authErrorKey(params.error ?? null) : null;
  const message = accountFailure ? withErrorDetail(t('account.accountLoadFailed'), accountFailure.detail)
    : errorKey ? t(`auth.${errorKey}`) : t('auth.finishingSignIn');

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const action = decideAuthAction({ token: params.token ?? null, error: params.error ?? null });

    if (action.type === "login") {
      completeLogin(action.token)
        .then(() => router.replace(action.target))
        .catch((err: any) => {
          setAccountFailure({ detail: err?.message });
          router.replace("/login");
        });
      return;
    }

    router.replace({ pathname: "/login", params: { error: params.error || "sign_in_failed" } });
  }, [completeLogin, params.error, params.token]);

  return (
    <View style={[styles.container, { alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }]}>
      <ActivityIndicator size="large" />
      <Text allowFontScaling={false} accessibilityLiveRegion="polite" style={styles.hint}>{message}</Text>
    </View>
  );
}
