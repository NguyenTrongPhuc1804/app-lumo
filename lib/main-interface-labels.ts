import type { TFunction } from "i18next";
import type { ModelOption } from "./api";
import { languageName } from "./translation-languages";

export function canUseAiModel(model: ModelOption | undefined, signedIn: boolean, paidFeatures: boolean, coinEnabled: boolean) {
  if (!model || model.code === "ml-kit") return false;
  if ((model.coinPrice ?? 0) > 0) return signedIn && coinEnabled;
  return model.sharedAi === true || (signedIn && paidFeatures);
}

const translationLanguageKeys = new Map([
  ["en", "main.english"],
  ["zh", "main.chinese"],
  ["ja", "main.japanese"],
  ["ko", "main.korean"],
  ["vi", "main.vietnamese"],
]);

export function translationLanguageLabel(code: string, t: TFunction, locale?: string) {
  const key = translationLanguageKeys.get(code);
  return key ? t(key) : languageName(code, locale);
}

export function modelOptionLabel(option: { code: string; label: string }, t: TFunction) {
  // Các model cùng mã vẫn có thể mang tên do server đặt.
  if (option.code === "google/gemini-flash-lite" && option.label === "Gemini Flash-Lite (nhanh)") return t("main.fastModel");
  if (option.code === "google/gemini-flash" && option.label === "Gemini Flash (chính xác hơn)") return t("main.accurateModel");
  return option.label;
}

// API/store vẫn trả lỗi dạng chuỗi: chỉ dịch thông báo đã biết, giữ nguyên lỗi khác.
const appErrorKeys = new Map([
  ["Không tải được lượt dùng thử. Vui lòng thử lại.", "main.trialLoadFailed"],
  ["Không tải được danh sách model.", "main.modelsLoadFailed"],
  ["Danh sách model không hợp lệ.", "main.invalidModels"],
  ["Cần đăng nhập bằng tài khoản quản trị để xem danh sách model.", "main.listAdminRequired"],
  ["Chưa cấu hình địa chỉ server", "main.serverMissing"],
  ["Phiên đăng nhập đã hết hạn", "main.expired"],
  ["Tài khoản không có quyền thực hiện thao tác này", "main.forbidden"],
  ["Cấu hình đã thay đổi. Vui lòng thử lại.", "main.configChanged"],
]);

export function mainInterfaceError(message: string, t: TFunction) {
  const key = appErrorKeys.get(message);
  if (key) return t(key);

  const modelsStatus = /^Không tải được model: HTTP (\d{3})$/.exec(message)?.[1];
  if (modelsStatus) return t("main.modelsHttpError", { value: modelsStatus });

  const serverStatus = /^Server trả về (\d{3})$/.exec(message)?.[1];
  if (serverStatus) return t("main.serverStatus", { value: serverStatus });

  return message;
}
