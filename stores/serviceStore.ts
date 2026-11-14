import { Platform } from "react-native";
import { create } from "zustand";
import ScreenTranslator from "../modules/screen-translator";

type ServiceState = {
  running: boolean;
  hasOverlayPermission: boolean;

  setRunning: (value: boolean) => void;
  // Đọc lại trạng thái từ máy, ví dụ sau khi người dùng cấp quyền nổi trên màn hình.
  refreshService: () => void;
};

export const useServiceStore = create<ServiceState>()((set) => ({
  running: false,
  hasOverlayPermission: false,

  setRunning: (value) => set({ running: value }),

  refreshService: () => {
    if (Platform.OS !== "android") return;
    set({
      hasOverlayPermission: ScreenTranslator.canDrawOverlays(),
      running: ScreenTranslator.isRunning(),
    });
  },
}));
