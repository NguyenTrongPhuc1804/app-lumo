import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { isInterfaceLanguage, type LanguagePreference } from "../lib/interface-language";

const STORAGE_KEY = "lumo-lens-interface-language";

type LanguageState = {
  hydrated: boolean;
  preference: LanguagePreference;
  storageError: "read" | "write" | null;
  setPreference: (preference: LanguagePreference) => Promise<void>;
};

// Ghi theo đúng thứ tự chọn, kể cả khi người dùng bấm nhiều lần liên tiếp.
let pendingWrite = Promise.resolve();

export const useLanguageStore = create<LanguageState>((set) => ({
  hydrated: false,
  preference: "system",
  storageError: null,
  setPreference(preference) {
    const write = pendingWrite.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, preference);
      } catch {
        // Chỉ báo lỗi của lần chọn mới nhất, kể cả khi người dùng chọn lại cùng ngôn ngữ.
        if (pendingWrite === write) set({ storageError: "write" });
      }
    });
    pendingWrite = write;
    set({ preference, storageError: null });
    return write;
  },
}));

AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
  useLanguageStore.setState({ hydrated: true, preference: isInterfaceLanguage(saved) ? saved : "system" });
}).catch(() => {
  useLanguageStore.setState({ hydrated: true, storageError: "read" });
});
