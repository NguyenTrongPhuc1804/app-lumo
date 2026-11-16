import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { DEFAULT_MODELS } from "../lib/api";
import ScreenTranslator from "../modules/screen-translator";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useModelStore } from "../stores/modelStore";
import { useServiceStore } from "../stores/serviceStore";

// Gom mọi việc đồng bộ giữa store và bên ngoài vào một chỗ:
// cấu hình cho service native, tải danh sách model, và trạng thái khi quay lại app.
// Chỉ gọi một lần trong màn hình gốc, sau khi đã đọc xong dữ liệu đã lưu.
export function useAppSync() {
  const translationMode = useConfigStore((s) => s.translationMode);
  const sourceLang = useConfigStore((s) => s.sourceLang);
  const targetLang = useConfigStore((s) => s.targetLang);
  const model = useConfigStore((s) => s.model);
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const token = useAuthStore((s) => s.token);

  // Đổi chế độ, ngôn ngữ hoặc model thì báo cho service native.
  // Token cũng gửi kèm để phiên dài không chết khi token được làm mới.
  useEffect(() => {
    if (Platform.OS === "android") {
      ScreenTranslator.updateConfig({ mode: translationMode, sourceLang, targetLang, model, token: token ?? "" });
    }
  }, [translationMode, sourceLang, targetLang, model, token]);

  // Đổi server thì bắt đầu lại danh sách model công khai.
  // Request cũ tự bị bỏ qua vì mỗi lần tải đều có số thứ tự mới.
  useEffect(() => {
    useModelStore.setState({ modelList: DEFAULT_MODELS });
    useModelStore.getState().reloadModels();
  }, [serverUrl]);

  // Đổi server hoặc tài khoản thì bắt đầu lại danh sách model riêng.
  useEffect(() => {
    useModelStore.setState({ customModels: [] });
    useModelStore.getState().reloadAdminModels();
  }, [serverUrl, token]);

  // Quay lại app (ví dụ sau khi cấp quyền) thì kiểm tra lại trạng thái.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    useServiceStore.getState().refreshService();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") useServiceStore.getState().refreshService();
    });
    return () => subscription.remove();
  }, []);
}
