import ScreenTranslator from "../modules/screen-translator";

export type CustomModel = {
  id: string;
  name: string;
  code: string;
  baseUrl: string;
  description?: string;
  apiKey: string; // chi con dang che tu server
};

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
// Lay danh sach model dang bat tu server, khong co thi tra ve danh sach mac dinh
export async function fetchModels(url: string): Promise<ModelOption[]> {
  if (!apiBase(url)) return DEFAULT_MODELS;
  const res = await fetch(`${apiBase(url)}/api/models`, {
    headers: { "x-app-key": process.env.EXPO_PUBLIC_APP_KEY ?? "" },
  });
  if (!res.ok) throw new Error(`Không tải được model: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Danh sách model không hợp lệ.");
  if (data.length === 0) return DEFAULT_MODELS;
  return data.map((item: any) => ({ code: item.code, label: item.name || item.code, coinPrice: item.coinPrice ?? 0, ...(item.sharedAi === true && { sharedAi: true }) }));
}

// Danh sach day du cho man CRUD (can token cua tai khoan admin)
export async function fetchAdminModels(url: string, token: string): Promise<CustomModel[]> {
  if (!token.trim()) throw new Error("Cần đăng nhập bằng tài khoản quản trị để xem danh sách model.");
  if (!apiBase(url)) throw new Error("Nhập địa chỉ server trong tab Cài đặt.");
  const res = await fetch(`${apiBase(url)}/api/admin/models`, { headers: authHeaders(token) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(authError(res.status, data));
  if (!Array.isArray(data)) throw new Error("Danh sách model không hợp lệ.");
  return data;
}

// Xoa model tren server. Tra ve thong bao loi, null neu thanh cong.
export async function deleteModel(serverUrl: string, token: string, id: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiBase(serverUrl)}/api/admin/models/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return authError(res.status, data);
  } catch (err: any) {
    return err.message;
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
