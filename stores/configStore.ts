import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ML_KIT_LANGUAGES, OCR_LANGUAGES } from "../lib/translation-languages";

// Khóa mới. Ba khóa bên dưới là của bản cũ, chỉ dùng để chuyển dữ liệu một lần.
const STORAGE_KEY = "lumo-lens-config";
const LEGACY_SETTINGS = "lumo-lens-settings";
const LEGACY_ADMIN_KEY = "lumo-lens-admin-key";
const LEGACY_ONBOARDED = "lumo-lens-onboarded";

type ConfigState = {
  serverUrl: string;
  sourceLang: string;
  targetLang: string;
  translationMode: "game" | "manga";
  model: string;
  hydrated: boolean; // true khi đã đọc xong dữ liệu đã lưu

  setServerUrl: (value: string) => void;
  chooseLanguage: (forWhich: "source" | "target", code: string) => void;
  swapLanguages: () => void;
  setModel: (code: string) => void;
  setTranslationMode: (value: "game" | "manga") => void;
};

type LegacyConfig = {
  serverUrl?: string;
  sourceLang?: string;
  targetLang?: string;
  model?: string;
};

// Đọc các khóa của bản cũ. Không có gì dùng được thì trả về null.
// Không còn chuyển adminKey/onboarded vì app đã dùng đăng nhập thay thế.
async function loadLegacyConfig(): Promise<LegacyConfig | null> {
  const [settingsRaw] = await Promise.all([
    AsyncStorage.getItem(LEGACY_SETTINGS),
    AsyncStorage.getItem(LEGACY_ADMIN_KEY),
    AsyncStorage.getItem(LEGACY_ONBOARDED),
  ]);

  let settings: Record<string, unknown> = {};
  if (settingsRaw) {
    try {
      const parsed = JSON.parse(settingsRaw);
      if (parsed && typeof parsed === "object") settings = parsed;
    } catch {
      // Dữ liệu cũ hỏng thì bỏ qua và dùng mặc định.
    }
  }

  const config: LegacyConfig = {};
  if (typeof settings.serverUrl === "string" && settings.serverUrl) config.serverUrl = settings.serverUrl;
  if (typeof settings.sourceLang === "string" && settings.sourceLang) config.sourceLang = settings.sourceLang;
  if (typeof settings.targetLang === "string" && settings.targetLang) config.targetLang = settings.targetLang;
  if (typeof settings.model === "string" && settings.model) config.model = settings.model;

  return Object.keys(config).length > 0 ? config : null;
}

// Storage riêng: lần đầu đọc khóa mới mà chưa có thì chuyển từ khóa cũ sang.
const configStorage = {
  async getItem(name: string) {
    let legacy: LegacyConfig | null = null;
    try {
      const saved = await AsyncStorage.getItem(name);
      if (saved) return saved;
      legacy = await loadLegacyConfig();
    } catch {
      // Đọc lỗi thì dùng mặc định, app vẫn chạy được.
      return null;
    }
    if (!legacy) return null;

    const value = JSON.stringify({ state: legacy, version: 0 });
    try {
      // Ghi khóa mới trước, chỉ xóa khóa cũ khi đã ghi xong.
      await AsyncStorage.setItem(name, value);
    } catch {
      // Chưa ghi được khóa mới thì giữ nguyên khóa cũ để lần sau chuyển lại.
      return null;
    }
    try {
      // Luôn dọn khóa admin cũ: đó là bí mật nằm trên máy, không dùng nữa.
      await Promise.all([
        AsyncStorage.removeItem(LEGACY_SETTINGS),
        AsyncStorage.removeItem(LEGACY_ADMIN_KEY),
        AsyncStorage.removeItem(LEGACY_ONBOARDED),
      ]);
    } catch {
      // Xóa khóa cũ lỗi thì bỏ qua: khóa mới đã có dữ liệu, khóa cũ còn lại vô hại.
    }
    return value;
  },
  async setItem(name: string, value: string) {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Ghi lỗi thì thôi, không để promise bị từ chối mà không ai bắt.
    }
  },
  async removeItem(name: string) {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Không có gì để làm khi xóa lỗi.
    }
  },
};

// Dọn khóa admin còn sót từ bản cũ, kể cả khi khóa cấu hình mới đã tồn tại.
async function clearLegacyAdminKey() {
  try {
    await AsyncStorage.removeItem(LEGACY_ADMIN_KEY);
  } catch {
    // Bỏ qua: khóa cũ chỉ nằm trên máy, không dùng ở đâu nữa.
  }
}
clearLegacyAdminKey();

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      serverUrl: process.env.EXPO_PUBLIC_SERVER_URL ?? "",
      sourceLang: "en",
      targetLang: "vi",
      translationMode: "game",
      model: "ml-kit",
      hydrated: false,

      setServerUrl: (value) => set({ serverUrl: value }),
      setModel: (code) => set({ model: code }),
      setTranslationMode: (value) => set({ translationMode: value }),

      // Chọn ngôn ngữ. Chọn trùng ngôn ngữ bên kia thì hoán đổi hai bên.
      chooseLanguage: (forWhich, code) => {
        const { sourceLang, targetLang } = get();
        if (forWhich === "source") {
          if (!OCR_LANGUAGES.includes(code)) return;
          set({ sourceLang: code, targetLang: code === targetLang ? sourceLang : targetLang });
        } else {
          if (!ML_KIT_LANGUAGES.includes(code)) return;
          // Nếu đích cũ không đọc được bằng OCR, dùng nguồn thay thế thay vì đảo sang đích cũ.
          const nextSource = OCR_LANGUAGES.includes(targetLang) ? targetLang : code === "en" ? "vi" : "en";
          set({ targetLang: code, sourceLang: code === sourceLang ? nextSource : sourceLang });
        }
      },

      swapLanguages: () => {
        const { sourceLang, targetLang } = get();
        if (OCR_LANGUAGES.includes(targetLang)) set({ sourceLang: targetLang, targetLang: sourceLang });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => configStorage),
      merge: (persistedState, currentState) => {
        const saved = persistedState as Partial<ConfigState> | undefined;
        return {
          ...currentState,
          ...saved,
          // URL rong tu ban cu khong duoc ghi de URL moi trong bien moi truong.
          serverUrl: typeof saved?.serverUrl === "string" && saved.serverUrl.trim()
            ? saved.serverUrl
            : currentState.serverUrl,
        };
      },
      // Chỉ lưu cấu hình người dùng chọn, không lưu cờ và hàm.
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        translationMode: state.translationMode,
        model: state.model,
      }),
      onRehydrateStorage: () => () => {
        // Chạy sau khi đọc xong (kể cả khi lỗi) để màn hình biết có thể vẽ.
        useConfigStore.setState({ hydrated: true });
      },
    }
  )
);
