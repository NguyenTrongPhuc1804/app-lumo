import ScreenTranslator from "../modules/screen-translator";

// Danh sach ngon ngu dung chung cho ca "Nguon" va "Cua toi"
export const LANGS = [
  { code: "en", label: "Tiếng Anh" },
  { code: "zh", label: "Tiếng Trung" },
  { code: "ja", label: "Tiếng Nhật" },
  { code: "ko", label: "Tiếng Hàn" },
  { code: "vi", label: "Tiếng Việt" },
];

// Model mac dinh neu chua lay duoc tu server
export const DEFAULT_MODELS = [
  { code: "google/gemini-flash-lite", label: "Gemini Flash-Lite (nhanh)" },
  { code: "google/gemini-flash", label: "Gemini Flash (chính xác hơn)" },
];

const apiBase = (url: string) => url.trim().replace(/\/+$/, "");

// Thong tin tai khoan tra ve tu GET /api/me
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: "user" | "admin";
  plan: string;
  isAdmin: boolean;
  dailyLimit: number;
  usageCount: number;
  usageDate: string;
  coinBalance?: number;
  coinPaymentsEnabled?: boolean;
  proExpiresAt?: string | null;
  playPro?: { productId: string; basePlanId: string; monthlyCoins: number; accountId: string };
};

// Loi 401 nghia la phien het han; 403 nghia la khong du quyen.
// App dua vao cau chu nay de biet co phai dang xuat hay khong.
function authError(status: number, data: any): string {
  if (status === 401) return "Phiên đăng nhập đã hết hạn";
  if (status === 403) return data?.error || "Tài khoản không có quyền thực hiện thao tác này";
  return data?.error || `Server trả về ${status}`;
}

const authHeaders = (token: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

// Thong tin tai khoan dang dang nhap, kem han muc con lai
export async function fetchMe(url: string, token: string): Promise<AuthUser> {
  if (!apiBase(url)) throw new Error("Chưa cấu hình địa chỉ server");
  const res = await fetch(`${apiBase(url)}/api/me`, { headers: authHeaders(token) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(authError(res.status, data));
  if (!data || typeof data !== "object") throw new Error("Thông tin tài khoản không hợp lệ.");
  return data as AuthUser;
}

export async function verifyPlayPro(url: string, token: string, purchaseToken: string) {
  if (!apiBase(url)) throw new Error("Chưa cấu hình địa chỉ server");
  const res = await fetch(`${apiBase(url)}/api/subscription/google-play/verify`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify({ purchaseToken }),
  });
  if (!res.ok) throw new Error(authError(res.status, await res.json().catch(() => null)));
}

export const labelOf = (code: string) => LANGS.find((lang) => lang.code === code)?.label ?? code;

export type ModelOption = { code: string; label: string; coinPrice?: number; sharedAi?: boolean };
export type ModelConnectionError =
  | { reason: "missingUrl" | "offline" | "dns" | "network" | "timeout" | "invalidResponse" }
  | { reason: "http"; status: number };

export async function fetchModels(url: string): Promise<ModelOption[]> {
  const base = apiBase(url);
  if (!base) throw { reason: "missingUrl" } satisfies ModelConnectionError;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${base}/api/models`, {
      headers: { "x-app-key": process.env.EXPO_PUBLIC_APP_KEY ?? "" },
      signal: controller.signal,
    }).catch((error: unknown) => {
      if (controller.signal.aborted) throw { reason: "timeout" } satisfies ModelConnectionError;
      if (ScreenTranslator.hasActiveNetwork?.() === false) throw { reason: "offline" } satisfies ModelConnectionError;
      if (/UnknownHostException|Unable to resolve host|ERR_NAME_NOT_RESOLVED/i.test(String(error))) {
        throw { reason: "dns" } satisfies ModelConnectionError;
      }
      throw { reason: "network" } satisfies ModelConnectionError;
    });
    if (!res.ok) throw { reason: "http", status: res.status } satisfies ModelConnectionError;
    const data = await res.json().catch(() => null);
    if (controller.signal.aborted) throw { reason: "timeout" } satisfies ModelConnectionError;
    if (!Array.isArray(data) || data.some(item => typeof item?.code !== "string" || !item.code.trim())) {
      throw { reason: "invalidResponse" } satisfies ModelConnectionError;
    }
    if (data.length === 0) return DEFAULT_MODELS;
    return data.map(item => ({ code: item.code, label: item.name || item.code, coinPrice: item.coinPrice ?? 0, ...(item.sharedAi === true && { sharedAi: true }) }));
  } finally {
    clearTimeout(timeout);
  }
}

// Chi dang xuat sau khi server xac nhan xoa. 404 cho phep thu lai khi mat response.
export async function deleteAccount(serverUrl: string, token: string): Promise<string | null> {
  if (!apiBase(serverUrl)) return "Chưa cấu hình địa chỉ server";
  try {
    const res = await fetch(`${apiBase(serverUrl)}/api/me`, { method: "DELETE", headers: authHeaders(token) });
    if (res.ok || res.status === 404) return null;
    const data = await res.json().catch(() => ({}));
    // Token van hop le nhung user da mat: lan xoa truoc co the bi mat response.
    if (res.status === 401 && data?.code === "ACCOUNT_NOT_FOUND") return null;
    return authError(res.status, data);
  } catch (err: any) {
    return err?.message || "Không kết nối được server";
  }
}

export async function fetchGuestQuota(url: string): Promise<{ remaining: number; freeLimit: number }> {
  const res = await fetch(`${apiBase(url)}/api/guest/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ installId: ScreenTranslator.getGuestInstallId() }),
  });
  if (!res.ok) throw new Error("Không tải được lượt dùng thử. Vui lòng thử lại.");
  return await res.json();
}

// Bat/tat nut dich noi. Tra ve true neu da bat.
export async function startTranslator(config: {
  mode?: "game" | "manga";
  serverUrl: string;
  token: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  accentColor: string;
  allowAutomatic?: boolean;
}): Promise<boolean> {
  return await ScreenTranslator.start(config);
}

export function stopTranslator() {
  ScreenTranslator.stop();
}
