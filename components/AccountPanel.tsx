import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../hooks/useTheme";
import StitchIcon from "./StitchIcon";
import { GoogleMark } from "./BrandMarks";

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

export default function AccountPanel({ onOpenModels }: { onOpenModels: () => void }) {
  const { styles, ACCENT, DANGER, TEXT_MUTED } = useTheme();
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
      {/* The thong tin: avatar trai, ten va email ben phai giong Stitch */}
      <View style={styles.accountCard}>
        <Text allowFontScaling={false} style={styles.accountIdLine}>LUMO ID: {shortIdOf(user.id)}</Text>
        <View style={styles.accountTopRow}>
          <View style={styles.accountAvatarRing}>
            <View style={styles.accountAvatar}>
              <Text allowFontScaling={false} style={styles.accountAvatarText}>{initialsOf(user.name)}</Text>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={styles.accountMemberPill}>
              <View style={styles.accountMemberPillDot} />
              <Text allowFontScaling={false} style={styles.accountMemberPillText}>{user.isAdmin ? "Quản trị viên Lumo" : "Thành viên Lumo"}</Text>
            </View>
            <Text allowFontScaling={false} style={styles.accountName} numberOfLines={1}>{user.name || "Người dùng Lumo"}</Text>
            <Text allowFontScaling={false} style={styles.accountEmail} numberOfLines={1}>{user.email || "Chưa có email"}</Text>
          </View>
        </View>
      </View>

      {/* Han muc: so lon, thanh tien do, nut cap nhat */}
      <View style={styles.card}>
        <View style={styles.quotaHeaderRow}>
          <StitchIcon name="speed" size={17} color={ACCENT} />
          <Text allowFontScaling={false} style={[styles.sectionTitle, { flex: 1 }]}>Hạn mức hôm nay</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cập nhật hạn mức" style={styles.compactIconButton} onPress={() => reloadMe().catch(() => {})}>
            <StitchIcon name="refresh" size={18} color={ACCENT} />
          </Pressable>
        </View>
        {remaining === null ? (
          <Text allowFontScaling={false} style={styles.hint}>Tài khoản quản trị không bị giới hạn lượt dịch.</Text>
        ) : (
          <>
            <Text allowFontScaling={false} style={styles.quotaValue}>{remaining}/{limit}</Text>
            <View style={styles.quotaTrack}>
              <View style={[styles.quotaFill, { width: `${Math.round(filled * 100)}%` }]} />
            </View>
            <Text allowFontScaling={false} style={styles.hint}>
              Mỗi lần cần gọi model mới tính một lượt. Câu đã dịch trước đó không bị tính.
            </Text>
          </>
        )}
      </View>

      {/* Danh sach hang co icon mau, giong khoi tien ich trong Stitch */}
      <View style={styles.accountList}>
        <View style={styles.accountListRow}>
          <View style={[styles.accountRowIcon, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}>
            <GoogleMark size={18} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text allowFontScaling={false} style={styles.accountRowTitle}>Phương thức đăng nhập</Text>
            <Text allowFontScaling={false} style={styles.accountRowSub}>Email do Google xác thực</Text>
          </View>
          <Text allowFontScaling={false} style={styles.accountRowValue}>Google</Text>
        </View>

        <View style={styles.accountListRow}>
          <View style={[styles.accountRowIcon, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
            <StitchIcon name="key" size={18} color={ACCENT} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text allowFontScaling={false} style={styles.accountRowTitle}>Gói hiện tại</Text>
            <Text allowFontScaling={false} style={styles.accountRowSub}>
              {user.plan === "free" ? "Miễn phí, đổi gói sau" : user.plan}
            </Text>
          </View>
          <Text allowFontScaling={false} style={styles.accountRowValue}>{user.plan === "free" ? "Miễn phí" : user.plan}</Text>
        </View>

        {user.isAdmin ? (
          <Pressable style={[styles.accountListRow, { borderBottomWidth: 0 }]} accessibilityRole="button" accessibilityLabel="Mở quản lý Model AI" onPress={onOpenModels}>
            <View style={[styles.accountRowIcon, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}>
              <StitchIcon name="memory" size={18} color="#0284C7" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text allowFontScaling={false} style={styles.accountRowTitle}>Quản lý Model AI</Text>
              <Text allowFontScaling={false} style={styles.accountRowSub}>Thêm, sửa, xoá model dịch</Text>
            </View>
            <Text allowFontScaling={false} style={styles.accountRowChevron}>›</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text allowFontScaling={false} style={styles.hint}>{error}</Text> : null}

      <Pressable style={styles.dangerButton} accessibilityRole="button" onPress={() => logout()}>
        <StitchIcon name="refresh" size={17} color={DANGER} />
        <Text allowFontScaling={false} style={styles.dangerButtonText}>Đăng xuất</Text>
      </Pressable>
      <Text allowFontScaling={false} style={styles.caption}>Phiên đăng nhập kéo dài 30 ngày. Đăng xuất sẽ xoá token khỏi máy.</Text>
    </>
  );
}
