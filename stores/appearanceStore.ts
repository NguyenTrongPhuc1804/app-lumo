import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { parseAppearance, type ColorMode, type TextSize } from "../lib/appearance-options";

// Khóa mới. Khóa cũ chỉ dùng để chuyển dữ liệu một lần.
const STORAGE_KEY = "lumo-lens-appearance-store";
const LEGACY_APPEARANCE = "lumo-lens-appearance";

const READ_ERROR = "Không đọc được giao diện đã lưu. Đang dùng mặc định.";
const WRITE_ERROR = "Không lưu được giao diện. Lựa chọn chỉ áp dụng cho lần mở này.";

type AppearanceState = {
  colorMode: ColorMode;
  textSize: TextSize;
  storageError: string | null;
  hydrated: boolean;

  setColorMode: (mode: ColorMode) => void;
  setTextSize: (size: TextSize) => void;
};

// Lỗi đọc ghi lại ở đây vì lúc đọc dữ liệu lần đầu store chưa tạo xong.
let readError: string | null = null;
// Chỉ khi người dùng đổi lựa chọn thì lần ghi thành công mới xóa thông báo lỗi.
// Lần ghi ngay sau khi đọc dữ liệu không tính là người dùng đổi.
let userChanged = false;

// Storage riêng: đọc khóa cũ nếu khóa mới chưa có, và báo lỗi đọc/ghi ra state.
const appearanceStorage = {
  async getItem(name: string) {
    try {
      const saved = await AsyncStorage.getItem(name);
      if (saved) return saved;

      const legacy = await AsyncStorage.getItem(LEGACY_APPEARANCE);
      if (!legacy) return null;

      const appearance = parseAppearance(legacy);
      const value = JSON.stringify({ state: appearance, version: 0 });
      // Ghi khóa mới trước, chỉ xóa khóa cũ khi đã ghi xong.
      await AsyncStorage.setItem(name, value);
      await AsyncStorage.removeItem(LEGACY_APPEARANCE);
      return value;
    } catch {
      readError = READ_ERROR;
      return null;
    }
  },
  async setItem(name: string, value: string) {
    try {
      await AsyncStorage.setItem(name, value);
      // Chỉ đổi state khi thật sự cần: mỗi lần đổi state sẽ kích hoạt persist ghi lại.
      if (userChanged && useAppearanceStore.getState().storageError !== null) {
        useAppearanceStore.setState({ storageError: null });
      }
    } catch {
      if (useAppearanceStore.getState().storageError !== WRITE_ERROR) {
        useAppearanceStore.setState({ storageError: WRITE_ERROR });
      }
    }
  },
  removeItem(name: string) {
    return AsyncStorage.removeItem(name);
  },
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      colorMode: "light",
      textSize: "auto",
      storageError: null,
      hydrated: false,

      setColorMode: (mode) => {
        userChanged = true;
        set({ colorMode: mode });
      },
      setTextSize: (size) => {
        userChanged = true;
        set({ textSize: size });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => appearanceStorage),
      // Chỉ lưu lựa chọn; thông báo lỗi và cờ không cần lưu.
      partialize: (state) => ({ colorMode: state.colorMode, textSize: state.textSize }),
      onRehydrateStorage: () => () => {
        useAppearanceStore.setState({ hydrated: true, storageError: readError });
        readError = null;
      },
    }
  )
);
