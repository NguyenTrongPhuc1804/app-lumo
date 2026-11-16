// Deep link server chuyen ve sau khi dang nhap xong.
// Phai khop APP_DEEP_LINK trong .env cua server.
export const AUTH_DEEP_LINK = "lumolens://auth";

export type AuthLink = { token: string | null; error: string | null };

// Doc token hoac ma loi tu query cua deep link.
// URL hong thi tra ve ca hai null, khong nem loi.
export function parseAuthLink(url: string | null | undefined): AuthLink {
  if (!url) return { token: null, error: null };
  try {
    const parsed = new URL(url);
    return { token: parsed.searchParams.get("token"), error: parsed.searchParams.get("error") };
  } catch {
    return { token: null, error: null };
  }
}

// Ma loi ngan tu server doi thanh cau tieng Viet de hien thi.
export function describeAuthError(code: string | null): string | null {
  if (!code) return null;
  if (code === "google_denied") return "Bạn đã huỷ đăng nhập Google. Thử lại khi sẵn sàng.";
  if (code === "account_blocked") return "Tài khoản đã bị khoá. Liên hệ quản trị viên.";
  if (code === "google_failed") return "Không đăng nhập được Google. Vui lòng thử lại.";
  return "Đăng nhập thất bại. Vui lòng thử lại.";
}
