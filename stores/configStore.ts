import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Khóa mới. Ba khóa bên dưới là của bản cũ, chỉ dùng để chuyển dữ liệu một lần.
const STORAGE_KEY = "lumo-lens-config";
const LEGACY_SETTINGS = "lumo-lens-settings";
const LEGACY_ADMIN_KEY = "lumo-lens-admin-key";
const LEGACY_ONBOARDED = "lumo-lens-onboarded";

type ConfigState = {
  serverUrl: string;
  adminKey: string;
  sourceLang: string;
  targetLang: string;
  translationMode: "game" | "manga";
  model: string;
  onboarded: boolean;
  hydrated: boolean; // true khi đã đọc xong dữ liệu đã lưu

  setServerUrl: (value: string) => void;
  setAdminKey: (value: string) => void;
  chooseLanguage: (forWhich: "source" | "target", code: string) => void;
  swapLanguages: () => void;
  setModel: (code: string) => void;
  setTranslationMode: (value: "game" | "manga") => void;
  finishOnboarding: () => void;
};

type LegacyConfig = {
  serverUrl?: string;
  adminKey?: string;
  sourceLang?: string;
  targetLang?: string;
  model?: string;
  onboarded?: boolean;
};

// Đọc 3 khóa của bản cũ. Không có gì dùng được thì trả về null.
async function loadLegacyConfig(): Promise<LegacyConfig | null> {
  const [settingsRaw, adminKey, onboardedRaw] = await Promise.all([
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
  if (adminKey) config.adminKey = adminKey;
  if (onboardedRaw === "yes") config.onboarded = true;

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

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      serverUrl: process.env.EXPO_PUBLIC_SERVER_URL ?? "",
      adminKey: process.env.EXPO_PUBLIC_ADMIN_KEY ?? "",
      sourceLang: "en",
      targetLang: "vi",
      translationMode: "game",
      model: "",
      onboarded: false,
      hydrated: false,

      setServerUrl: (value) => set({ serverUrl: value }),
      setAdminKey: (value) => set({ adminKey: value }),
      setModel: (code) => set({ model: code }),
      setTranslationMode: (value) => set({ translationMode: value }),
      finishOnboarding: () => set({ onboarded: true }),

      // Chọn ngôn ngữ. Chọn trùng ngôn ngữ bên kia thì hoán đổi hai bên.
      chooseLanguage: (forWhich, code) => {
        const { sourceLang, targetLang } = get();
        if (forWhich === "source") {
          if (code === targetLang) set({ targetLang: sourceLang });
          set({ sourceLang: code });
        } else {
          if (code === sourceLang) set({ sourceLang: targetLang });
          set({ targetLang: code });
        }
      },

      swapLanguages: () => {
        const { sourceLang, targetLang } = get();
        set({ sourceLang: targetLang, targetLang: sourceLang });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => configStorage),
      // Chỉ lưu cấu hình người dùng chọn, không lưu cờ và hàm.
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        adminKey: state.adminKey,
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        translationMode: state.translationMode,
        model: state.model,
        onboarded: state.onboarded,
      }),
      onRehydrateStorage: () => () => {
        // Chạy sau khi đọc xong (kể cả khi lỗi) để màn hình biết có thể vẽ.
        useConfigStore.setState({ hydrated: true });
      },
    }
  )
);
