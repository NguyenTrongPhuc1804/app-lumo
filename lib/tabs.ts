import type { StitchIconName } from "../components/StitchIcon";

export type TabKey = "home" | "models" | "settings" | "account";
// Tab Tai khoan dung glyph ve bang View (PersonGlyph) vi font icon
// da duoc sub-set va khong co glyph nguoi dung.
export type TabIcon = StitchIconName | "person";
export type Tab = { key: TabKey; icon: TabIcon; label: string };

// Thu tu tab co dinh, chi khac o cho co tab Model AI hay khong.
const HOME: Tab = { key: "home", icon: "explore", label: "Trang chủ" };
const MODELS: Tab = { key: "models", icon: "memory", label: "Model AI" };
const SETTINGS: Tab = { key: "settings", icon: "tune", label: "Cài đặt" };
const ACCOUNT: Tab = { key: "account", icon: "person", label: "Tài khoản" };

// Chi admin moi thay tab quan ly model.
// Tham so nhan ca object user hoac null (chua tai xong) de de goi tu component.
export function tabsForRole(user: { isAdmin?: boolean } | null | undefined): Tab[] {
  return user?.isAdmin ? [HOME, MODELS, SETTINGS, ACCOUNT] : [HOME, SETTINGS, ACCOUNT];
}
