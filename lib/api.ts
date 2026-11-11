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

export const labelOf = (code: string) => LANGS.find((lang) => lang.code === code)?.label ?? code;

type ModelOption = { code: string; label: string };

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
  return data.map((item: any) => ({ code: item.code, label: item.name || item.code }));
}

// Danh sach day du cho man CRUD (can x-admin-key)
export async function fetchAdminModels(url: string, adminKey: string): Promise<CustomModel[]> {
  if (!adminKey.trim()) throw new Error("Nhập ADMIN_KEY trong tab Cài đặt để xem danh sách model.");
  if (!apiBase(url)) throw new Error("Nhập địa chỉ server trong tab Cài đặt.");
  const res = await fetch(`${apiBase(url)}/api/admin/models`, {
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey.trim() },
  });
  if (res.status === 401) throw new Error("ADMIN_KEY không hợp lệ. Kiểm tra lại trong tab Cài đặt.");
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Server trả về ${res.status}`);
  if (!Array.isArray(data)) throw new Error("Danh sách model không hợp lệ.");
  return data;
}

// Xoa model tren server. Tra ve thong bao loi, null neu thanh cong.
export async function deleteModel(serverUrl: string, adminKey: string, id: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiBase(serverUrl)}/api/admin/models/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey.trim() },
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error || `Server trả về ${res.status}`;
  } catch (err: any) {
    return err.message;
  }
}

// Bat/tat nut dich noi. Tra ve true neu da bat.
export async function startTranslator(config: {
  mode?: "game" | "manga";
  serverUrl: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  accentColor: string;
}): Promise<boolean> {
  return await ScreenTranslator.start({
    ...config,
    appKey: process.env.EXPO_PUBLIC_APP_KEY ?? "",
  });
}

export function stopTranslator() {
  ScreenTranslator.stop();
}
