import { lazy, Suspense, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { withErrorDetail } from "../lib/auth-account-format";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "./StitchIcon";
import { GoogleMark } from "./BrandMarks";

const PlayProPanel = lazy(() => import("./PlayProPanel"));

// Hai chu cai dau cua ten, dung khi tai khoan khong co anh dai dien.
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// Ma tai khoan ngan gon, chi de hien thi cho giong the thanh vien trong Stitch.
function shortIdOf(id: string) {
  const digits = id.replace(/\D/g, "").slice(-4);
  return digits ? `#${digits}-LENS` : "#LENS";
}

export default function AccountPanel() {
  const { styles, ACCENT, DANGER } = useTheme();
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const reloadMe = useAuthStore((s) => s.reloadMe);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const askDeleteAccount = () => {
    if (!user || deletingRef.current) return;
    // Khoa ngay ca khi hop thoai dang mo de khong tao nhieu xac nhan.
    deletingRef.current = true;
    let submitted = false;
    const cancel = () => { deletingRef.current = false; };
    const confirmation = t('account.deleteConfirmation');
    Alert.alert(t('account.deleteTitle'), user.isAdmin ? `${confirmation}\n\n${t('account.deleteAdminNote')}` : confirmation, [
      { text: t('account.cancel'), style: "cancel", onPress: cancel },
      {
        text: t('account.deletePermanently'),
        style: "destructive",
        onPress: async () => {
          if (submitted) return;
          submitted = true;
          setDeleting(true);
          try {
            const error = await deleteAccount();
            if (error) Alert.alert(t('account.deleteFailed'), error, [{ text: t('auth.ok') }]);
          } catch {
            Alert.alert(t('account.deleteFailed'), t('auth.tryAgain'), [{ text: t('auth.ok') }]);
          } finally {
            deletingRef.current = false;
            setDeleting(false);
          }
        },
      },
    ], { cancelable: false });
  };

  // Chua tai xong thong tin thi hien trang thai cho, khong hien "undefined".
  if (!user) {
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <ActivityIndicator />
          <Text allowFontScaling={false} accessibilityLiveRegion="polite" style={styles.hint}>{error ? withErrorDetail(t('account.accountLoadFailed'), error) : t('account.loadingAccount')}</Text>
        </View>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => reloadMe().catch(() => {})}>
          <Text allowFontScaling={false} style={styles.secondaryButtonText}>{t('account.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const limit = user.dailyLimit > 0 ? user.dailyLimit : 0;
  const used = user.usageCount;
  const remaining = limit > 0 ? Math.max(0, limit - used) : null;
  const filled = limit > 0 ? Math.min(1, used / limit) : 0;
  const number = new Intl.NumberFormat(i18n.language);
  const coinBalance = user.coinBalance ?? 0;
  const planLabel = user.plan === "free" ? t('account.freePlan') : user.plan === "pro" ? t('account.proPlan') : user.plan;

  return (
    <>
      {/* The thong tin: avatar trai, ten va email ben phai giong Stitch */}
      <View style={styles.accountCard}>
        <Text allowFontScaling={false} style={styles.accountIdLine}>{t('account.lumoId', { id: shortIdOf(user.id) })}</Text>
        <View style={styles.accountTopRow}>
          <View style={styles.accountAvatarRing}>
            <View style={styles.accountAvatar}>
              <Text allowFontScaling={false} style={styles.accountAvatarText}>{initialsOf(user.name)}</Text>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={styles.accountMemberPill}>
              <View style={styles.accountMemberPillDot} />
              <Text allowFontScaling={false} style={styles.accountMemberPillText}>{user.isAdmin ? t('account.admin') : t('account.member')}</Text>
            </View>
            <Text allowFontScaling={false} style={styles.accountName} numberOfLines={1}>{user.name || t('account.fallbackName')}</Text>
            <Text allowFontScaling={false} style={styles.accountEmail} numberOfLines={1}>{user.email || t('account.fallbackEmail')}</Text>
          </View>
        </View>
      </View>

      {/* Han muc: so lon, thanh tien do, nut cap nhat */}
      <View style={styles.card}>
        <View style={styles.quotaHeaderRow}>
          <StitchIcon name="speed" size={17} color={ACCENT} />
          <Text allowFontScaling={false} style={[styles.sectionTitle, { flex: 1 }]}>{t('account.quotaTitle')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('account.refreshQuota')} style={styles.compactIconButton} onPress={() => reloadMe().catch(() => {})}>
            <StitchIcon name="refresh" size={18} color={ACCENT} />
          </Pressable>
        </View>
        {remaining === null ? (
          <Text allowFontScaling={false} style={styles.hint}>{t('account.unlimited')}</Text>
        ) : (
          <>
            <Text allowFontScaling={false} style={styles.quotaValue}>{number.format(remaining)}/{number.format(limit)}</Text>
            <View style={styles.quotaTrack}>
              <View style={[styles.quotaFill, { width: `${Math.round(filled * 100)}%` }]} />
            </View>
            <Text allowFontScaling={false} style={styles.hint}>
              {t('account.quotaHint')}
            </Text>
          </>
        )}
      </View>

      {user.coinPaymentsEnabled && <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('account.wallet')}</Text>
        <Text style={styles.quotaValue}>{t('account.coinBalance', { count: coinBalance, amount: number.format(coinBalance) })}</Text>
        <Text style={styles.hint}>{t('account.coinsHint')}</Text>
      </View>}

      {user.playPro && Platform.OS === 'android' && <Suspense fallback={<ActivityIndicator />}>
        <PlayProPanel key={user.id} user={user} />
      </Suspense>}

      {/* Danh sach hang co icon mau, giong khoi tien ich trong Stitch */}
      <View style={styles.accountList}>
        <View style={styles.accountListRow}>
          <View style={[styles.accountRowIcon, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}>
            <GoogleMark size={18} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text allowFontScaling={false} style={styles.accountRowTitle}>{t('account.signInMethod')}</Text>
            <Text allowFontScaling={false} style={styles.accountRowSub}>{t('account.googleVerified')}</Text>
          </View>
          <Text allowFontScaling={false} style={styles.accountRowValue}>Google</Text>
        </View>

        <View style={styles.accountListRow}>
          <View style={[styles.accountRowIcon, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
            <StitchIcon name="key" size={18} color={ACCENT} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text allowFontScaling={false} style={styles.accountRowTitle}>{t('account.currentPlan')}</Text>
            <Text allowFontScaling={false} style={styles.accountRowSub}>
              {user.plan === "free" ? t('account.freePlanHint') : planLabel}
            </Text>
          </View>
          <Text allowFontScaling={false} style={styles.accountRowValue}>{planLabel}</Text>
        </View>
      </View>

      {error ? <Text allowFontScaling={false} accessibilityLiveRegion="polite" style={styles.hint}>{withErrorDetail(t('account.accountLoadFailed'), error)}</Text> : null}

      <Pressable style={styles.dangerButton} accessibilityRole="button" disabled={deleting} onPress={() => logout()}>
        <StitchIcon name="refresh" size={17} color={DANGER} />
        <Text allowFontScaling={false} style={styles.dangerButtonText}>{t('account.signOut')}</Text>
      </Pressable>
      <Pressable style={styles.deleteAccountButton} accessibilityRole="button" accessibilityLabel={deleting ? t('account.deletingAccount') : t('account.deleteAccountA11y')} accessibilityState={{ disabled: deleting, busy: deleting }} disabled={deleting} onPress={askDeleteAccount}>
        {deleting ? <ActivityIndicator color={DANGER} /> : <StitchIcon name="delete" size={17} color={DANGER} />}
        <Text allowFontScaling={false} style={styles.deleteAccountText}>{deleting ? t('account.deletingAccount') : t('account.deleteAccount')}</Text>
      </Pressable>
      <Text allowFontScaling={false} style={styles.caption}>{t('account.sessionHint')}</Text>
    </>
  );
}
