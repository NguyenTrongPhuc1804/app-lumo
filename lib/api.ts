import ScreenTranslator from "../modules/screen-translator";

export type CustomModel = {
  id: string;
  name: string;
  code: string;
  baseUrl: string;
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
  try {
    const res = await fetch(`${apiBase(url)}/api/models`, {
      headers: { "x-app-key": process.env.EXPO_PUBLIC_APP_KEY ?? "" },
    });
    if (!res.ok) return DEFAULT_MODELS;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return DEFAULT_MODELS;
    return data.map((item: any) => ({ code: item.code, label: item.name || item.code }));
  } catch {
    return DEFAULT_MODELS;
  }
}

// Danh sach day du cho man CRUD (can x-admin-key)
export async function fetchAdminModels(url: string, adminKey: string): Promise<CustomModel[] | "unauthorized"> {
  if (!adminKey.trim()) return [];
  try {
    const res = await fetch(`${apiBase(url)}/api/admin/models`, {
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey.trim() },
    });
    if (res.status === 401) return "unauthorized";
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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
