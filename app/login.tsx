import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AUTH_DEEP_LINK, parseAuthLink } from "../lib/auth-link";
import { authErrorKey, withErrorDetail } from "../lib/auth-account-format";
import { decideAuthAction } from "../lib/auth-route";
import { legalUrl, type LegalPage } from "../lib/legal";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "../components/StitchIcon";
import { GoogleMark, FacebookMark, FingerprintMark } from "../components/BrandMarks";

// Mo trang dang nhap cua server trong trinh duyet he thong.
// Server tu chuyen sang Google roi quay ve app qua deep link.
function authUrl(serverUrl: string, provider: "google" | "facebook") {
  return `${serverUrl.trim().replace(/\/+$/, "")}/api/auth/${provider}/start`;
}

export default function LoginScreen() {
  const { styles, ACCENT } = useTheme();
  const { t } = useTranslation();
  const loginPerks = t('auth.loginPerks', { returnObjects: true }) as string[];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ error?: string }>();
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const error = useAuthStore((s) => s.error);
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const [opening, setOpening] = useState(false);
  const [localError, setLocalError] = useState<ReturnType<typeof authErrorKey> | "loginClosed">(null);
  const busy = useRef(false);

  const errorKey = localError ?? authErrorKey(params.error ?? null);
  const message = errorKey ? t(`auth.${errorKey}`) : error ? withErrorDetail(t('account.accountLoadFailed'), error) : null;

  useEffect(() => {
    // Server da tra loi bang deep link; o day khong lam gi them.
  }, []);

  const openLegal = async (page: LegalPage) => {
    const url = legalUrl(serverUrl, page);
    if (!url) {
      Alert.alert(t('auth.serverMissing'), t('auth.legalServerMissing'), [{ text: t('auth.ok') }]);
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err: any) {
      Alert.alert(t('auth.browserFailed'), err?.message ?? t('auth.tryAgain'), [{ text: t('auth.ok') }]);
    }
  };

  const startLogin = async (provider: "google" | "facebook") => {
    if (busy.current) return;
    if (provider === "facebook") {
      Alert.alert(t('auth.comingSoon'), t('auth.facebookUnavailable'), [{ text: t('auth.ok') }]);
      return;
    }
    if (!serverUrl.trim()) {
      Alert.alert(t('auth.serverMissing'), t('auth.loginServerMissing'), [{ text: t('auth.ok') }]);
      return;
    }

    busy.current = true;
    setOpening(true);
    setLocalError(null);
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl(serverUrl, provider), AUTH_DEEP_LINK);

      // Custom Tab có thể đóng mà router không bắt được deep link, nên đọc URL trả về luôn.
      if (result.type === "success" && result.url) {
        const link = parseAuthLink(result.url);
        const action = decideAuthAction(link);
        if (action.type === "login") {
          try {
            await completeLogin(action.token);
            router.replace(action.target);
          } catch (err: any) {
            Alert.alert(t('account.accountLoadFailed'), err?.message ?? t('auth.tryAgain'), [{ text: t('auth.ok') }]);
          }
          return;
        }
        setLocalError(authErrorKey(link.error) ?? "signInFailed");
        return;
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        setLocalError("loginClosed");
      }
    } catch (err: any) {
      Alert.alert(t('auth.browserFailed'), err?.message ?? t('auth.tryAgain'), [{ text: t('auth.ok') }]);
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
          <Text allowFontScaling={false} style={styles.syncPillText}>{t('auth.sync')}</Text>
        </View>
      </View>

      {/* The hero theo dung cau truc Stitch */}
      <View style={styles.loginHeroCard}>
        <View style={styles.loginHeroTop}>
          <View style={styles.loginHeroKicker}>
            <View style={styles.loginHeroDot} />
            <Text allowFontScaling={false} style={styles.loginHeroKickerText}>{t('auth.cloudKeyring')}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text allowFontScaling={false} style={styles.activeBadgeText}>{t('auth.active')}</Text>
          </View>
        </View>
        <View style={styles.loginHeroBody}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text allowFontScaling={false} style={styles.loginTitle}>{t('auth.welcomeTitle')}</Text>
            <Text allowFontScaling={false} style={styles.loginSubtitle}>
              {t('auth.welcomeSubtitle')}
            </Text>
          </View>
          <View style={styles.loginHeroIcon}>
            <StitchIcon name="crop_free" size={22} color={ACCENT} />
          </View>
        </View>
      </View>

      {message ? (
        <View style={styles.infoBox}>
          <Text allowFontScaling={false} accessibilityLiveRegion="polite" style={styles.hint}>{message}</Text>
        </View>
      ) : null}

      {/* The dang nhap: khoi tieu de 1-cham roi den hai nut xep doc */}
      <View style={styles.loginCard}>
        <View style={styles.oneTapHeader}>
          <View style={styles.oneTapIcon}>
            <StitchIcon name="speed" size={18} color={ACCENT} />
          </View>
          <Text allowFontScaling={false} style={styles.oneTapTitle}>{t('auth.oneTapTitle')}</Text>
          <Text allowFontScaling={false} style={styles.oneTapSubtitle}>{t('auth.oneTapSubtitle')}</Text>
        </View>

        <Pressable
          style={styles.socialButton}
          accessibilityRole="button"
          accessibilityLabel={opening ? t('auth.openingBrowser') : t('auth.googleSignIn')}
          accessibilityState={{ disabled: opening, busy: opening }}
          disabled={opening}
          onPress={() => startLogin("google")}
        >
          <View style={styles.socialMarkBox}><GoogleMark size={20} /></View>
          <Text allowFontScaling={false} style={styles.socialButtonText}>{opening ? t('auth.openingBrowser') : t('auth.googleContinue')}</Text>
        </Pressable>

        <Pressable
          style={[styles.socialButton, styles.socialButtonFacebook]}
          accessibilityRole="button"
          accessibilityLabel={t('auth.facebookSignIn')}
          onPress={() => startLogin("facebook")}
        >
          <View style={styles.socialMarkBox}><FacebookMark size={18} /></View>
          <Text allowFontScaling={false} style={styles.socialButtonTextOnColor}>{t('auth.facebookContinue')}</Text>
        </Pressable>

        {/* Dong bao mat van tay, dung cau chu va kieu can giua nhu thiet ke */}
        <View style={styles.fingerprintRow}>
          <FingerprintMark size={14} color={ACCENT} />
          <Text allowFontScaling={false} style={styles.fingerprintText}>{t('auth.fingerprintSecurity')}</Text>
        </View>
      </View>

      <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
        <Text style={styles.secondaryButtonText}>{t('auth.home')}</Text>
      </Pressable>

      {/* The quyen loi giong Stitch */}
      <View style={styles.perksCard}>
        <View style={styles.perksTitleRow}>
          <StitchIcon name="layers" size={15} color="#047857" />
          <Text allowFontScaling={false} style={styles.perksTitle}>{t('auth.perksTitle')}</Text>
        </View>
        {loginPerks.map((text) => (
          <View key={text} style={styles.perkRow}>
            <View style={styles.perkDot} />
            <Text allowFontScaling={false} style={styles.perkText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Footer dieu khoan */}
      <View style={styles.legalBar}>
        <Text allowFontScaling={false} style={styles.legalText}>
          {t('auth.legalIntro')}
        </Text>
        <View style={styles.legalLinksRow}>
          <Pressable accessibilityRole="link" accessibilityLabel={t('auth.openTerms')} onPress={() => openLegal("terms")}>
            <Text allowFontScaling={false} style={styles.legalLink}>{t('auth.terms')}</Text>
          </Pressable>
          <Text allowFontScaling={false} style={styles.legalText}>{t('auth.legalAnd')}</Text>
          <Pressable accessibilityRole="link" accessibilityLabel={t('auth.openPrivacy')} onPress={() => openLegal("privacy")}>
            <Text allowFontScaling={false} style={styles.legalLink}>{t('auth.privacy')}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
