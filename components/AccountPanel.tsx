import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "./StitchIcon";

// Hai chu cai dau cua ten, dung khi tai khoan khong co anh dai dien.
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AccountPanel({ onOpenModels }: { onOpenModels: () => void }) {
  const { styles, ACCENT, DANGER } = useTheme();
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const reloadMe = useAuthStore((s) => s.reloadMe);
  const logout = useAuthStore((s) => s.logout);

  // Chua tai xong thong tin thi hien trang thai cho, khong hien "undefined".
  if (!user) {
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <ActivityIndicator />
          <Text allowFontScaling={false} style={styles.hint}>{error ?? "Đang tải thông tin tài khoản…"}</Text>
        </View>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => reloadMe().catch(() => {})}>
          <Text allowFontScaling={false} style={styles.secondaryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  const limit = user.dailyLimit > 0 ? user.dailyLimit : 0;
  const used = user.usageCount;
  const remaining = limit > 0 ? Math.max(0, limit - used) : null;
  const filled = limit > 0 ? Math.min(1, used / limit) : 0;

  return (
    <>
      <View style={styles.accountCard}>
        <View style={styles.accountAvatarRing}>
          <View style={styles.accountAvatar}>
            <Text allowFontScaling={false} style={styles.accountAvatarText}>{initialsOf(user.name)}</Text>
          </View>
        </View>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text allowFontScaling={false} style={styles.accountName}>{user.name || "Người dùng Lumo"}</Text>
          <Text allowFontScaling={false} style={styles.accountEmail}>{user.email || "Chưa có email"}</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text allowFontScaling={false} style={styles.activeBadgeText}>{user.isAdmin ? "Quản trị viên" : "Thành viên Lumo"}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.iconLabel}>
          <StitchIcon name="speed" size={20} color={ACCENT} />
          <Text allowFontScaling={false} style={[styles.sectionTitle, { flex: 1 }]}>Hạn mức hôm nay</Text>
        </View>
        {remaining === null ? (
          <Text allowFontScaling={false} style={styles.hint}>Tài khoản quản trị không bị giới hạn lượt dịch.</Text>
        ) : (
          <>
            <Text allowFontScaling={false} style={styles.pageTitle}>{remaining}/{limit}</Text>
            <View style={styles.quotaTrack}>
              <View style={[styles.quotaFill, { width: `${Math.round(filled * 100)}%` }]} />
            </View>
            <Text allowFontScaling={false} style={styles.hint}>
              Mỗi lần cần gọi model mới tính một lượt. Câu đã dịch trước đó không bị tính.
            </Text>
          </>
        )}
        <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => reloadMe().catch(() => {})}>
          <View style={styles.iconLabel}><StitchIcon name="refresh" size={18} color={ACCENT} /><Text allowFontScaling={false} style={styles.secondaryButtonText}>Cập nhật</Text></View>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.accountRow}>
          <Text allowFontScaling={false} style={styles.accountRowLabel}>Phương thức đăng nhập</Text>
          <Text allowFontScaling={false} style={styles.accountRowValue}>Google</Text>
        </View>
        <View style={styles.accountRow}>
          <Text allowFontScaling={false} style={styles.accountRowLabel}>Gói hiện tại</Text>
          <Text allowFontScaling={false} style={styles.accountRowValue}>{user.plan === "free" ? "Miễn phí" : user.plan}</Text>
        </View>
        {user.isAdmin ? (
          <Pressable style={styles.manageQuickBtn} accessibilityRole="button" onPress={onOpenModels}>
            <Text allowFontScaling={false} style={styles.manageQuickText}>Mở quản lý Model AI</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text allowFontScaling={false} style={styles.hint}>{error}</Text> : null}

      <Pressable style={styles.dangerButton} accessibilityRole="button" onPress={() => logout()}>
        <StitchIcon name="refresh" size={18} color={DANGER} />
        <Text allowFontScaling={false} style={styles.dangerButtonText}>Đăng xuất</Text>
      </Pressable>
      <Text allowFontScaling={false} style={styles.caption}>Phiên đăng nhập kéo dài 30 ngày. Đăng xuất sẽ xoá token khỏi máy.</Text>
    </>
  );
}
