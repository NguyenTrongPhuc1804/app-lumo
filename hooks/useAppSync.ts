import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { DEFAULT_MODELS } from "../lib/api";
import { canUseAiModel } from "../lib/main-interface-labels";
import ScreenTranslator from "../modules/screen-translator";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useLanguageStore } from "../stores/languageStore";
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
  const user = useAuthStore((s) => s.user);
  const modelList = useModelStore((s) => s.modelList);
  const languagePreference = useLanguageStore((s) => s.preference);
  const previousSession = useRef({ serverUrl, token });

  useEffect(() => {
    const previous = previousSession.current;
    previousSession.current = { serverUrl, token };
    if (Platform.OS !== "android" || (previous.serverUrl === serverUrl && previous.token === token)) return;
    if (previous.token) ScreenTranslator.clearOfflineTranslation?.(previous.serverUrl, previous.token);
    if (previous.serverUrl !== serverUrl && ScreenTranslator.isRunning()) {
      ScreenTranslator.stop();
      useServiceStore.getState().setRunning(false);
    }
  }, [serverUrl, token]);

  useEffect(() => {
    if (Platform.OS === "android") ScreenTranslator.setInterfaceLanguage?.(languagePreference);
  }, [languagePreference]);

  // Đổi chế độ, ngôn ngữ hoặc model thì báo cho service native.
  // Token cũng gửi kèm để phiên dài không chết khi token được làm mới.
  useEffect(() => {
    if (Platform.OS === "android") {
      const paidFeatures = Boolean(token) && (user?.isAdmin === true || !!(user?.proExpiresAt && Date.parse(user.proExpiresAt) > Date.now()));
      const basic = !canUseAiModel(modelList.find(item => item.code === model), Boolean(token), paidFeatures, user?.coinPaymentsEnabled === true);
      ScreenTranslator.updateConfig({ mode: basic || !paidFeatures ? "game" : translationMode, sourceLang, targetLang, model: basic ? "ml-kit" : model, token: token ?? "", allowAutomatic: paidFeatures });
    }
  }, [translationMode, sourceLang, targetLang, model, token, user, modelList]);

  // Đổi server thì bắt đầu lại danh sách model công khai.
  // Request cũ tự bị bỏ qua vì mỗi lần tải đều có số thứ tự mới.
  useEffect(() => {
    useModelStore.setState({ modelList: DEFAULT_MODELS });
    useModelStore.getState().reloadModels();
  }, [serverUrl]);

  // Quay lại app (ví dụ sau khi cấp quyền) thì kiểm tra lại trạng thái.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    useServiceStore.getState().refreshService();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        useServiceStore.getState().refreshService();
        void useModelStore.getState().reloadModels();
        // Tài khoản có thể đã bị khoá hoặc token hết hạn trong lúc app ở nền.
        // reloadMe tự xoá token khi gặp 401/403, chuyển app về chế độ khách.
        if (useAuthStore.getState().token) useAuthStore.getState().reloadMe().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);
}
